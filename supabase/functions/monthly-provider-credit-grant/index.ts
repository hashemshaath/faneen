import { createClient } from 'npm:@supabase/supabase-js@2';
import { grantMonthlyProviderCredit } from '../_shared/credits/index.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-cron-secret',
};

interface PlanLite { code: string; lead_credits_per_month: number; is_active: boolean }
interface SubRow {
  id: string;
  business_id: string;
  provider_user_id: string | null;
  status: string;
  current_period_start: string | null;
  current_period_end: string | null;
  lead_credits_balance: number;
  plan: PlanLite | null;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  // Authorize: must provide cron secret OR be an admin via JWT
  const cronSecret = Deno.env.get('CRON_SECRET') ?? '';
  const headerSecret = req.headers.get('x-cron-secret') ?? '';
  const authHeader = req.headers.get('Authorization') ?? '';

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

  let authorized = false;
  if (cronSecret && headerSecret && headerSecret === cronSecret) authorized = true;

  if (!authorized && authHeader.startsWith('Bearer ')) {
    const sb = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
    const { data } = await sb.auth.getClaims(authHeader.replace('Bearer ', ''));
    const uid = data?.claims?.sub;
    if (uid) {
      const { data: ok } = await sb.rpc('has_admin_access', { _user_id: uid });
      if (ok === true) authorized = true;
    }
  }

  if (!authorized) {
    return new Response(JSON.stringify({ error: 'unauthorized' }), {
      status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const admin = createClient(supabaseUrl, serviceKey);
  const errors: Array<{ subscription_id: string; code: string }> = [];
  let granted = 0; let skipped = 0;

  // EDGE-CRON-OBSERVABILITY-1: capture run start.
  const runStartedAt = new Date().toISOString();

  const { data: subs, error } = await admin
    .from('provider_subscriptions')
    .select('id, business_id, provider_user_id, status, current_period_start, current_period_end, lead_credits_balance, plan:provider_plans!inner(code, lead_credits_per_month, is_active)')
    .eq('status', 'active');

  if (error) {
    // best-effort: log the failed run
    try {
      await admin.rpc('log_cron_run', {
        _job_name: 'monthly-provider-credit-grant',
        _function_name: 'monthly-provider-credit-grant',
        _started_at: runStartedAt,
        _finished_at: new Date().toISOString(),
        _ok: false,
        _status: 'select_failed',
        _summary: { processed: 0, granted: 0, skipped: 0, error_count: 1 },
        _error_code: 'select_failed',
        _error_message: null,
      });
    } catch (_logErr) { /* never break cron on log failure */ }
    return new Response(JSON.stringify({ ok: false, code: 'select_failed', error: 'Failed to load subscriptions' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const rows = (subs ?? []) as unknown as SubRow[];
  const now = new Date();
  const nowIso = now.toISOString();
  const periodEnd = new Date(now.getTime());
  periodEnd.setMonth(periodEnd.getMonth() + 1);

  for (const s of rows) {
    try {
      if (!s.plan || !s.plan.is_active || s.plan.lead_credits_per_month <= 0) { skipped++; continue; }
      const due = !s.current_period_end || new Date(s.current_period_end) <= now;
      if (!due) { skipped++; continue; }

      // EDGE-4: atomic grant via SECURITY DEFINER RPC. Idempotency key
      // (`monthly:<sub>:YYYY-MM`, UTC) is built and enforced inside the RPC,
      // so the 25-day client probe is no longer needed.
      const newPeriodEndIso = periodEnd.toISOString();
      const { data: grantData, error: grantErr } = await grantMonthlyProviderCredit(admin, {
        subscriptionId: s.id,
        amount: s.plan.lead_credits_per_month,
        periodStart: nowIso,
        periodEnd: newPeriodEndIso,
        planCode: s.plan.code,
      });
      if (grantErr) {
        throw new Error((grantErr as { message?: string }).message ?? String(grantErr));
      }
      const g = (grantData ?? {}) as {
        ok?: boolean;
        granted?: boolean;
        idempotent?: boolean;
        code?: string;
      };
      if (g.ok === false) {
        throw new Error(g.code ?? 'grant_failed');
      }
      if (g.granted === true) {
        granted++;
      } else {
        // ok:true with granted:false → idempotent replay
        skipped++;
      }
    } catch (err) {
      const code = err instanceof Error ? (err as Error & { code?: string }).code ?? 'grant_failed' : 'grant_failed';
      errors.push({ subscription_id: s.id, code });
    }
  }

  // EDGE-CRON-OBSERVABILITY-1: best-effort log of this monthly run.
  // Do NOT echo raw error messages from provider/RPC; just counts + codes.
  try {
    await admin.rpc('log_cron_run', {
      _job_name: 'monthly-provider-credit-grant',
      _function_name: 'monthly-provider-credit-grant',
      _started_at: runStartedAt,
      _finished_at: new Date().toISOString(),
      _ok: errors.length === 0,
      _status: errors.length === 0 ? 'ok' : 'partial',
      _summary: {
        processed: rows.length,
        granted,
        skipped,
        error_count: errors.length,
      },
      _error_code: errors.length > 0 ? 'partial_failure' : null,
      _error_message: null,
    });
  } catch (_logErr) {
    // swallow — observability must never break cron success
  }

  return new Response(
    JSON.stringify({ success: true, processed: rows.length, granted, skipped, errors }),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
  );
});