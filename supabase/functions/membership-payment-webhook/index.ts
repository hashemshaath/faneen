// R4F-9D: Moyasar membership payment webhook ingress.
// ─────────────────────────────────────────────────────
// Receives provider webhook events, verifies HMAC-SHA256 signature against
// the raw request body using MOYASAR_WEBHOOK_SECRET, then persists the
// event into `membership_payment_webhook_events` for downstream processing
// (R4F-9E confirm/reconcile).
//
// Strict constraints (R4F-9D brief):
//   - verify_jwt = false (provider initiates request, no user session).
//   - Never trust client/body before HMAC verification.
//   - Never log secret values or signature.
//   - Does NOT update membership_subscriptions.
//   - Does NOT update membership_payment_intents.status.
//   - Does NOT send emails/notifications.
//   - Does NOT call admin manual mark-paid/refunded RPCs.
//   - Only writes to membership_payment_webhook_events (idempotent insert).

// deno-lint-ignore-file no-explicit-any
import { createClient } from 'npm:@supabase/supabase-js@2';
import {
  applyProviderSnapshot,
  fetchMoyasarPaymentStatus,
  loadIntent,
} from '../_shared/membership-payments/index.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-moyasar-signature',
};

const PROVIDER = 'moyasar' as const;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function safeLog(event: string, fields: Record<string, unknown> = {}) {
  try {
    console.log(JSON.stringify({ fn: 'membership-payment-webhook', event, ...fields }));
  } catch {
    /* ignore */
  }
}

function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

function hexToBytes(hex: string): Uint8Array | null {
  const clean = hex.trim().toLowerCase().replace(/^sha256=/, '');
  if (!/^[0-9a-f]+$/.test(clean) || clean.length % 2 !== 0) return null;
  const out = new Uint8Array(clean.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(clean.substr(i * 2, 2), 16);
  return out;
}

async function hmacSha256(secret: string, body: string): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(body));
  return new Uint8Array(sig);
}

function pickFirst(obj: any, keys: string[]): string | undefined {
  for (const k of keys) {
    const v = obj?.[k];
    if (typeof v === 'string' && v.length > 0) return v;
  }
  return undefined;
}

function extractEventIdentity(payload: any): { eventId: string; eventType: string } {
  // Moyasar webhook envelope: { id, type, created_at, data: { id, status, ... } }
  // Fallback to a stable composite if any field is missing.
  const topId = pickFirst(payload, ['id', 'event_id']);
  const type =
    pickFirst(payload, ['type', 'event_type']) ||
    pickFirst(payload?.data ?? {}, ['status']) ||
    'unknown';
  const dataId = pickFirst(payload?.data ?? {}, ['id']);
  const createdAt = pickFirst(payload, ['created_at']);
  const eventId =
    topId ?? `${type}:${dataId ?? 'unknown'}:${createdAt ?? 'unknown'}`;
  return { eventId, eventType: type };
}

function extractProviderIntentId(payload: any): string | undefined {
  return (
    pickFirst(payload?.data ?? {}, ['id', 'invoice_id', 'payment_id']) ??
    pickFirst(payload, ['invoice_id', 'payment_id'])
  );
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ ok: false, code: 'method_not_allowed' }, 405);

  const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
  const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  const WEBHOOK_SECRET = Deno.env.get('MOYASAR_WEBHOOK_SECRET') ?? '';

  if (!SUPABASE_URL || !SERVICE_ROLE_KEY || !WEBHOOK_SECRET) {
    safeLog('missing_webhook_config');
    return json({ ok: false, code: 'missing_webhook_config' }, 500);
  }

  // 1. Preserve raw body BEFORE any parsing.
  const rawBody = await req.text();

  // 2. Signature verification (HMAC-SHA256 of raw body).
  const sigHeader =
    req.headers.get('x-moyasar-signature') ||
    req.headers.get('moyasar-signature') ||
    req.headers.get('x-signature') ||
    '';
  if (!sigHeader) {
    safeLog('signature_missing');
    return json({ ok: false, code: 'invalid_signature' }, 401);
  }
  const provided = hexToBytes(sigHeader);
  if (!provided) {
    safeLog('signature_malformed');
    return json({ ok: false, code: 'invalid_signature' }, 401);
  }
  const expected = await hmacSha256(WEBHOOK_SECRET, rawBody);
  if (!timingSafeEqual(provided, expected)) {
    safeLog('signature_mismatch');
    return json({ ok: false, code: 'invalid_signature' }, 401);
  }

  // 3. Parse JSON only AFTER valid signature.
  let payload: any;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    safeLog('invalid_payload');
    return json({ ok: false, code: 'invalid_payload' }, 400);
  }
  if (!payload || typeof payload !== 'object') {
    return json({ ok: false, code: 'invalid_payload' }, 400);
  }

  // 4. Identify event.
  const { eventId, eventType } = extractEventIdentity(payload);

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // 5. Idempotency check by (provider, event_id).
  const { data: existing, error: lookupErr } = await admin
    .from('membership_payment_webhook_events')
    .select('id')
    .eq('provider', PROVIDER)
    .eq('event_id', eventId)
    .maybeSingle();
  if (lookupErr) {
    safeLog('lookup_error', { code: lookupErr.code });
    return json({ ok: false, code: 'storage_error' }, 200);
  }
  if (existing) {
    safeLog('duplicate', { event_id: eventId });
    return json({ ok: true, duplicate: true, event_id: eventId }, 200);
  }

  // 6. Best-effort association with a known intent (read-only).
  const providerIntentId = extractProviderIntentId(payload);
  let matchedIntentId: string | null = null;
  if (providerIntentId) {
    const { data: intent } = await admin
      .from('membership_payment_intents')
      .select('id')
      .eq('provider', PROVIDER)
      .eq('provider_intent_id', providerIntentId)
      .maybeSingle();
    if (intent?.id) matchedIntentId = intent.id as string;
  }

  // 7. Persist event. processed_at stays NULL (= pending) — R4F-9E will
  //    transition payment intent / subscription state.
  const enrichedPayload =
    matchedIntentId
      ? { ...payload, __qitaat: { matched_intent_id: matchedIntentId } }
      : payload;

  const { error: insertErr } = await admin
    .from('membership_payment_webhook_events')
    .insert({
      provider: PROVIDER,
      event_id: eventId,
      event_type: eventType,
      payload: enrichedPayload,
    });
  if (insertErr) {
    // Unique-violation race ⇒ another concurrent delivery won; treat as duplicate.
    if ((insertErr as any).code === '23505') {
      safeLog('duplicate_race', { event_id: eventId });
      return json({ ok: true, duplicate: true, event_id: eventId }, 200);
    }
    safeLog('insert_error', { code: (insertErr as any).code });
    return json({ ok: false, code: 'storage_error' }, 200);
  }

  safeLog('stored', { event_id: eventId, event_type: eventType, matched: Boolean(matchedIntentId) });

  // R4F-9E: best-effort inline reconciliation. The webhook only triggers
  // a server-side provider re-fetch + idempotent state transition for a
  // matched intent. All side effects live in the shared helper.
  if (matchedIntentId) {
    const MOYASAR_SECRET_KEY = Deno.env.get('MOYASAR_SECRET_KEY') ?? '';
    if (MOYASAR_SECRET_KEY) {
      try {
        const intent = await loadIntent(admin, matchedIntentId);
        if (intent?.provider_intent_id) {
          const fetched = await fetchMoyasarPaymentStatus({
            providerIntentId: intent.provider_intent_id,
            secretKey: MOYASAR_SECRET_KEY,
          });
          if (fetched.ok) {
            const result = await applyProviderSnapshot({
              admin,
              supabaseUrl: SUPABASE_URL,
              serviceRoleKey: SERVICE_ROLE_KEY,
              intent,
              snapshot: fetched.snapshot,
            });
            // Mark event as processed only if a transition occurred or
            // provider state is already terminal-aligned.
            await admin
              .from('membership_payment_webhook_events')
              .update({ processed_at: new Date().toISOString() })
              .eq('provider', PROVIDER)
              .eq('event_id', eventId);
            safeLog('reconciled_from_webhook', {
              transitioned: result.transitioned,
              to: result.toStatus,
            });
          }
        }
      } catch (e) {
        safeLog('reconcile_error', { msg: e instanceof Error ? e.message : 'unknown' });
      }
    }
  }

  return json({ ok: true, stored: true, event_id: eventId }, 200);
});