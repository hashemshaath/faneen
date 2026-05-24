// R4F-9E: Moyasar membership payment confirm edge function.
// ─────────────────────────────────────────────────────────
// Called from the user return page (and admin tools) to fetch the
// authoritative provider state for a single payment intent and apply
// the matching internal status transition idempotently.
//
// Strict invariants:
//   - verify_jwt = true (default); only authenticated callers.
//   - Never trusts client-supplied status (e.g. ?status=success in the
//     return URL). Status comes only from Moyasar.
//   - Caller must own the intent OR be an admin.
//   - Reconciliation, side effects, and idempotency are delegated to the
//     shared helper at supabase/functions/_shared/membership-payments.

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
    'authorization, x-client-info, apikey, content-type',
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function safeLog(event: string, fields: Record<string, unknown> = {}) {
  try {
    console.log(JSON.stringify({ fn: 'membership-payment-confirm', event, ...fields }));
  } catch { /* ignore */ }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ ok: false, code: 'method_not_allowed' }, 405);

  const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
  const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
  const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  const MOYASAR_SECRET_KEY = Deno.env.get('MOYASAR_SECRET_KEY') ?? '';
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SERVICE_ROLE_KEY) {
    return json({ ok: false, code: 'missing_payment_config' }, 200);
  }

  const authHeader = req.headers.get('Authorization') ?? '';
  if (!authHeader.startsWith('Bearer ')) {
    return json({ ok: false, code: 'unauthorized' }, 401);
  }
  const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });
  const token = authHeader.replace('Bearer ', '');
  const { data: claimsRes, error: claimsErr } = await userClient.auth.getClaims(token);
  if (claimsErr || !claimsRes?.claims?.sub) {
    return json({ ok: false, code: 'unauthorized' }, 401);
  }
  const callerId = claimsRes.claims.sub as string;

  let body: any;
  try {
    body = await req.json();
  } catch {
    return json({ ok: false, code: 'invalid_body' }, 400);
  }
  const intentId = typeof body?.intentId === 'string' ? body.intentId : '';
  if (!intentId) return json({ ok: false, code: 'invalid_body' }, 400);

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const intent = await loadIntent(admin, intentId);
  if (!intent) return json({ ok: false, code: 'not_found' }, 200);

  // Ownership / admin gate.
  if (intent.user_id !== callerId) {
    const { data: isAdmin } = await admin.rpc('has_role', {
      _user_id: callerId,
      _role: 'admin',
    });
    if (!isAdmin) return json({ ok: false, code: 'unauthorized' }, 403);
  }

  // Already terminal? Return current state without re-fetch.
  if (
    intent.status === 'succeeded' ||
    intent.status === 'refunded' ||
    intent.status === 'failed' ||
    intent.status === 'cancelled'
  ) {
    return json({
      ok: true,
      payment_intent_id: intent.id,
      status: intent.status,
      subscription_id: intent.subscription_id,
      activated: false,
      terminal: true,
    });
  }

  if (!intent.provider_intent_id || intent.provider !== 'moyasar') {
    return json({ ok: false, code: 'status_not_final' }, 200);
  }
  if (!MOYASAR_SECRET_KEY) {
    return json({ ok: false, code: 'missing_payment_config' }, 200);
  }

  const fetched = await fetchMoyasarPaymentStatus({
    providerIntentId: intent.provider_intent_id,
    secretKey: MOYASAR_SECRET_KEY,
  });
  if (!fetched.ok) {
    safeLog('provider_error', { code: fetched.code });
    return json({ ok: false, code: 'provider_error' }, 200);
  }

  const result = await applyProviderSnapshot({
    admin,
    supabaseUrl: SUPABASE_URL,
    serviceRoleKey: SERVICE_ROLE_KEY,
    intent,
    snapshot: fetched.snapshot,
  });

  safeLog('reconciled', {
    intent_id: intent.id,
    from: result.fromStatus,
    to: result.toStatus,
    transitioned: result.transitioned,
  });

  return json({
    ok: true,
    payment_intent_id: intent.id,
    status: result.toStatus ?? intent.status,
    subscription_id: intent.subscription_id,
    activated: result.transitioned && result.toStatus === 'succeeded',
  });
});