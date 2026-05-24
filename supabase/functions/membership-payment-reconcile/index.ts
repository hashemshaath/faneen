// R4F-9E: Moyasar membership payment reconcile edge function.
// ─────────────────────────────────────────────────────────────
// Same reconciliation primitive as `membership-payment-confirm`, exposed
// as a separate function for admin / cron / out-of-band recovery flows.
// Differences from confirm:
//   - Accepts `{ intentId }` or `{ providerIntentId }`.
//   - Admins may reconcile any intent; users only their own.
//   - Always re-fetches provider state even for terminal-looking intents
//     so refunded transitions can be observed after a prior success.
//
// All transitions and side effects are delegated to the shared helper.

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
  const claims = claimsRes?.claims as { sub?: string; role?: string } | undefined;
  const isServiceRole = !claimsErr && claims?.role === 'service_role';
  const callerId = (claims?.sub as string | undefined) ?? '';
  if (!isServiceRole && (claimsErr || !callerId)) {
    return json({ ok: false, code: 'unauthorized' }, 401);
  }

  let body: any;
  try { body = await req.json(); } catch { return json({ ok: false, code: 'invalid_body' }, 400); }

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // ──────────────────────────────────────────────────────────────
  // R4F-9J: cron-sweep branch.
  // Triggered hourly by jobid 30 with body `{ triggeredBy: 'cron' }`.
  // Walks pending Moyasar intents and reconciles each idempotently
  // via the shared helper. Caps work per run and isolates per-intent
  // failures so one bad row doesn't abort the sweep.
  // ──────────────────────────────────────────────────────────────
  const isCronSweep =
    body?.triggeredBy === 'cron' || body?.mode === 'cron-sweep';
  if (isCronSweep && !body?.intentId && !body?.providerIntentId) {
    // Authorize: service-role token OR admin user.
    let allowed = isServiceRole;
    if (!allowed && callerId) {
      const { data: isAdmin } = await admin.rpc('has_role', {
        _user_id: callerId,
        _role: 'admin',
      });
      allowed = isAdmin === true;
    }
    if (!allowed) return json({ ok: false, code: 'unauthorized' }, 403);

    if (!MOYASAR_SECRET_KEY) {
      return json({ ok: true, mode: 'noop', reason: 'missing_payment_config', scanned: 0 });
    }

    const SWEEP_LIMIT = 25;
    const GRACE_MINUTES = 5;
    const cutoff = new Date(Date.now() - GRACE_MINUTES * 60_000).toISOString();

    const { data: rows, error: selErr } = await admin
      .from('membership_payment_intents')
      .select(
        'id, subscription_id, user_id, status, amount, currency, provider, provider_intent_id, plan_id, billing_cycle, business_id',
      )
      .eq('provider', 'moyasar')
      .in('status', ['created', 'requires_action'])
      .not('provider_intent_id', 'is', null)
      .lt('created_at', cutoff)
      .order('created_at', { ascending: true })
      .limit(SWEEP_LIMIT);

    if (selErr) {
      return json({ ok: true, mode: 'cron-sweep', scanned: 0, error: 'select_failed' });
    }

    const summary = {
      ok: true as const,
      mode: 'cron-sweep' as const,
      scanned: rows?.length ?? 0,
      processed: 0,
      succeeded: 0,
      failed: 0,
      cancelled: 0,
      still_pending: 0,
      errors: [] as Array<{ intent_id: string; code: string }>,
    };

    // EDGE-CRON-OBSERVABILITY-1: capture start for the cron run log.
    const sweepStartedAt = new Date().toISOString();

    for (const intent of rows ?? []) {
      try {
        const fetched = await fetchMoyasarPaymentStatus({
          providerIntentId: intent.provider_intent_id as string,
          secretKey: MOYASAR_SECRET_KEY,
        });
        if (!fetched.ok) {
          summary.errors.push({ intent_id: intent.id, code: 'provider_error' });
          continue;
        }
        const result = await applyProviderSnapshot({
          admin,
          supabaseUrl: SUPABASE_URL,
          serviceRoleKey: SERVICE_ROLE_KEY,
          intent: intent as any,
          snapshot: fetched.snapshot,
        });
        summary.processed += 1;
        const to = result.toStatus;
        if (to === 'succeeded') summary.succeeded += 1;
        else if (to === 'failed') summary.failed += 1;
        else if (to === 'cancelled') summary.cancelled += 1;
        else summary.still_pending += 1;
      } catch (_e) {
        summary.errors.push({ intent_id: intent.id, code: 'exception' });
      }
    }

    // EDGE-CRON-OBSERVABILITY-1: best-effort log of this sweep run.
    // Never store raw provider payloads or secrets; only safe counts +
    // error codes. Failure to log must NOT fail the cron job.
    try {
      await admin.rpc('log_cron_run', {
        _job_name: 'membership-payment-reconcile-hourly',
        _function_name: 'membership-payment-reconcile',
        _started_at: sweepStartedAt,
        _finished_at: new Date().toISOString(),
        _ok: true,
        _status: 'cron-sweep',
        _summary: {
          scanned: summary.scanned,
          processed: summary.processed,
          succeeded: summary.succeeded,
          failed: summary.failed,
          cancelled: summary.cancelled,
          still_pending: summary.still_pending,
          error_count: summary.errors.length,
        },
        _error_code: null,
        _error_message: null,
      });
    } catch (_logErr) {
      // swallow — observability must never break cron success
    }

    return json(summary);
  }

  // Single-intent path requires an authenticated user identity.
  if (!callerId) return json({ ok: false, code: 'unauthorized' }, 401);

  const intentId = typeof body?.intentId === 'string' ? body.intentId : '';
  const providerIntentId =
    typeof body?.providerIntentId === 'string' ? body.providerIntentId : '';
  if (!intentId && !providerIntentId) {
    return json({ ok: false, code: 'invalid_body' }, 400);
  }

  let intent = intentId ? await loadIntent(admin, intentId) : null;
  if (!intent && providerIntentId) {
    const { data } = await admin
      .from('membership_payment_intents')
      .select(
        'id, subscription_id, user_id, status, amount, currency, provider, provider_intent_id, plan_id, billing_cycle, business_id',
      )
      .eq('provider', 'moyasar')
      .eq('provider_intent_id', providerIntentId)
      .maybeSingle();
    intent = (data as any) ?? null;
  }
  if (!intent) return json({ ok: false, code: 'not_found' }, 200);

  if (intent.user_id !== callerId) {
    const { data: isAdmin } = await admin.rpc('has_role', {
      _user_id: callerId,
      _role: 'admin',
    });
    if (!isAdmin) return json({ ok: false, code: 'unauthorized' }, 403);
  }

  if (!intent.provider_intent_id || intent.provider !== 'moyasar') {
    return json({
      ok: true,
      payment_intent_id: intent.id,
      status: intent.status,
      subscription_id: intent.subscription_id,
      activated: false,
    });
  }
  if (!MOYASAR_SECRET_KEY) {
    return json({ ok: false, code: 'missing_payment_config' }, 200);
  }

  const fetched = await fetchMoyasarPaymentStatus({
    providerIntentId: intent.provider_intent_id,
    secretKey: MOYASAR_SECRET_KEY,
  });
  if (!fetched.ok) return json({ ok: false, code: 'provider_error' }, 200);

  const result = await applyProviderSnapshot({
    admin,
    supabaseUrl: SUPABASE_URL,
    serviceRoleKey: SERVICE_ROLE_KEY,
    intent,
    snapshot: fetched.snapshot,
  });

  return json({
    ok: true,
    payment_intent_id: intent.id,
    status: result.toStatus ?? intent.status,
    subscription_id: intent.subscription_id,
    activated: result.transitioned && result.toStatus === 'succeeded',
  });
});