import { createClient } from 'npm:@supabase/supabase-js@2';

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

      // Idempotency: skip if a monthly_grant already exists in current/last 25 days
      const sinceIso = new Date(now.getTime() - 25 * 24 * 60 * 60 * 1000).toISOString();
      const { data: recent } = await admin
        .from('provider_lead_credit_transactions')
        .select('id')
        .eq('business_id', s.business_id)
        .eq('reason', 'monthly_grant')
        .gte('created_at', sinceIso)
        .limit(1);
      if (recent && recent.length > 0) { skipped++; continue; }

      const amt = s.plan.lead_credits_per_month;
      const newBal = s.lead_credits_balance + amt;
      const newPeriodEndIso = periodEnd.toISOString();

      const { error: e1 } = await admin
        .from('provider_subscriptions')
        .update({
          lead_credits_balance: newBal,
          current_period_start: nowIso,
          current_period_end: newPeriodEndIso,
        })
        .eq('id', s.id);
      if (e1) throw new Error(e1.message);

      const { error: e2 } = await admin
        .from('provider_lead_credit_transactions')
        .insert({
          business_id: s.business_id,
          provider_user_id: s.provider_user_id,
          type: 'grant',
          amount: amt,
          balance_after: newBal,
          reason: 'monthly_grant',
          metadata: {
            plan_code: s.plan.code,
            period_start: nowIso,
            period_end: newPeriodEndIso,
          },
        });
      if (e2) throw new Error(e2.message);
      granted++;
    } catch (err) {
      errors.push({ subscription_id: s.id, error: err instanceof Error ? err.message : String(err) });
    }
  }

  return new Response(
    JSON.stringify({ success: true, processed: rows.length, granted, skipped, errors }),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
  );
});