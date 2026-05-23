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
  const errors: Array<{ subscription_id: string; error: string }> = [];
  let granted = 0; let skipped = 0;

  const { data: subs, error } = await admin
    .from('provider_subscriptions')
    .select('id, business_id, provider_user_id, status, current_period_start, current_period_end, lead_credits_balance, plan:provider_plans!inner(code, lead_credits_per_month, is_active)')
    .eq('status', 'active');

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
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
      errors.push({ subscription_id: s.id, error: err instanceof Error ? err.message : String(err) });
    }
  }

  return new Response(
    JSON.stringify({ success: true, processed: rows.length, granted, skipped, errors }),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
  );
});