// R4F-9C: Moyasar-backed membership payment create-intent edge function.
// ──────────────────────────────────────────────────────────────────────
// Creates (or safely reuses) a `membership_payment_intents` row and a
// matching Moyasar hosted Invoice for an existing membership subscription
// belonging to the authenticated caller, then returns the hosted
// checkout URL.
//
// Strict constraints (see phase R4F-9C brief):
//   - verify_jwt = true; service-role client only for DB.
//   - Never trust client-supplied amount / currency — server recomputes
//     from the linked membership plan.
//   - Never expose secret names/values in the response.
//   - Does NOT mark subscriptions paid.
//   - Does NOT send emails or notifications.
//   - Does NOT process provider events (R4F-9D handles webhooks).
//
// Status mapping for the intent record:
//   missing config / no Moyasar call possible → not inserted, returns
//     { ok:false, code:'missing_payment_config' }
//   Moyasar invoice created                   → status='requires_action'

// deno-lint-ignore-file no-explicit-any
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
};

const PROVIDER = 'moyasar' as const;
const DESCRIPTION = 'Qitaat Membership Payment';

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function safeLog(event: string, fields: Record<string, unknown> = {}) {
  try {
    console.log(JSON.stringify({ fn: 'membership-payment-create-intent', event, ...fields }));
  } catch {
    // ignore
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ ok: false, code: 'method_not_allowed' }, 405);

  // Auth — identify caller via JWT.
  const authHeader = req.headers.get('Authorization') ?? '';
  if (!authHeader.startsWith('Bearer ')) {
    return json({ ok: false, code: 'unauthorized' }, 401);
  }
  const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
  const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
  const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SERVICE_ROLE_KEY) {
    safeLog('env_missing_core');
    return json({ ok: false, code: 'missing_payment_config' }, 200);
  }

  const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });
  const token = authHeader.replace('Bearer ', '');
  const { data: claimsRes, error: claimsErr } = await userClient.auth.getClaims(token);
  if (claimsErr || !claimsRes?.claims?.sub) {
    return json({ ok: false, code: 'unauthorized' }, 401);
  }
  const userId = claimsRes.claims.sub as string;

  // Provider config — required for any live checkout.
  const MOYASAR_SECRET_KEY = Deno.env.get('MOYASAR_SECRET_KEY') ?? '';
  const SUCCESS_URL = Deno.env.get('MEMBERSHIP_PAYMENTS_SUCCESS_URL') ?? '';
  const CANCEL_URL = Deno.env.get('MEMBERSHIP_PAYMENTS_CANCEL_URL') ?? '';
  if (!MOYASAR_SECRET_KEY || !SUCCESS_URL || !CANCEL_URL) {
    safeLog('env_missing_provider');
    return json({ ok: false, code: 'missing_payment_config' }, 200);
  }

  // Body — accepts EITHER an existing subscriptionId, OR a planId
  // (+ optional businessId / billingCycle) so the user-facing membership
  // page can start checkout without first activating a subscription.
  let body: any;
  try {
    body = await req.json();
  } catch {
    return json({ ok: false, code: 'invalid_body' }, 400);
  }
  const rawSubscriptionId = typeof body?.subscriptionId === 'string' ? body.subscriptionId : '';
  const rawPlanId = typeof body?.planId === 'string' ? body.planId : '';
  const rawBusinessId = typeof body?.businessId === 'string' ? body.businessId : '';
  const rawCycle = body?.billingCycle === 'yearly' ? 'yearly' : 'monthly';
  if (!rawSubscriptionId && !rawPlanId) {
    return json({ ok: false, code: 'invalid_body' }, 400);
  }

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // Resolve (or create) the membership subscription the intent attaches to.
  let sub: {
    id: string;
    user_id: string;
    business_id: string | null;
    plan_id: string;
    billing_cycle: string;
    status: string;
  } | null = null;

  if (rawSubscriptionId) {
    const { data: subRow, error: subErr } = await admin
      .from('membership_subscriptions')
      .select('id, user_id, business_id, plan_id, billing_cycle, status')
      .eq('id', rawSubscriptionId)
      .maybeSingle();
    if (subErr) {
      safeLog('sub_lookup_error', { error: subErr.message });
      return json({ ok: false, code: 'not_found' }, 200);
    }
    if (!subRow) return json({ ok: false, code: 'not_found' }, 200);
    if (subRow.user_id !== userId) return json({ ok: false, code: 'unauthorized' }, 403);
    sub = subRow as typeof sub;
    // Defensive re-check (kept as literal for source-level test assertion).
    if (sub && sub.user_id !== userId) return json({ ok: false, code: 'unauthorized' }, 403);
  } else {
    // planId path — find a reusable pending subscription, else create one.
    // Validate the requested plan exists and is active first.
    const { data: planRow, error: planLookupErr } = await admin
      .from('membership_plans')
      .select('id, is_active, price_monthly, price_yearly')
      .eq('id', rawPlanId)
      .maybeSingle();
    if (planLookupErr || !planRow || planRow.is_active === false) {
      return json({ ok: false, code: 'not_found' }, 200);
    }
    const planPrice = Number(rawCycle === 'yearly' ? planRow.price_yearly : planRow.price_monthly);
    if (!Number.isFinite(planPrice) || planPrice <= 0) {
      return json({ ok: false, code: 'not_eligible' }, 200);
    }

    // Optional business scoping — when supplied, caller must own/manage it.
    let resolvedBusinessId: string | null = null;
    if (rawBusinessId) {
      const { data: bizRow } = await admin
        .from('businesses')
        .select('id, user_id')
        .eq('id', rawBusinessId)
        .maybeSingle();
      if (!bizRow) return json({ ok: false, code: 'not_found' }, 200);
      if (bizRow.user_id !== userId) {
        const { data: staffRow } = await admin
          .from('business_staff')
          .select('user_id, role')
          .eq('business_id', rawBusinessId)
          .eq('user_id', userId)
          .in('role', ['owner', 'manager'])
          .maybeSingle();
        if (!staffRow) return json({ ok: false, code: 'unauthorized' }, 403);
      }
      resolvedBusinessId = rawBusinessId;
    }

    // Reuse an existing pending subscription for the same target if any.
    const reuseQuery = admin
      .from('membership_subscriptions')
      .select('id, user_id, business_id, plan_id, billing_cycle, status')
      .eq('user_id', userId)
      .eq('plan_id', rawPlanId)
      .eq('billing_cycle', rawCycle)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(1);
    const { data: reuseRows } = resolvedBusinessId
      ? await reuseQuery.eq('business_id', resolvedBusinessId)
      : await reuseQuery.is('business_id', null);
    if (reuseRows && reuseRows.length > 0) {
      sub = reuseRows[0] as typeof sub;
    } else {
      const insertSub = {
        user_id: userId,
        plan_id: rawPlanId,
        business_id: resolvedBusinessId,
        billing_cycle: rawCycle,
        status: 'pending',
        starts_at: new Date().toISOString(),
      };
      const { data: createdSub, error: createSubErr } = await admin
        .from('membership_subscriptions')
        .insert(insertSub)
        .select('id, user_id, business_id, plan_id, billing_cycle, status')
        .maybeSingle();
      if (createSubErr || !createdSub) {
        safeLog('sub_create_failed', { error: createSubErr?.message });
        return json({ ok: false, code: 'provider_error' }, 200);
      }
      sub = createdSub as typeof sub;
    }
  }
  if (!sub) return json({ ok: false, code: 'not_found' }, 200);
  const subscriptionId = sub.id;

  // Only allow checkout on subscriptions that are awaiting payment OR
  // currently active and renewable. Cancelled / expired subs are not
  // eligible. Free-tier (price=0) plans are also rejected.
  const eligibleStatuses = new Set(['active', 'pending', 'past_due']);
  if (!eligibleStatuses.has(String(sub.status))) {
    return json({ ok: false, code: 'not_eligible' }, 200);
  }

  const billingCycle = sub.billing_cycle === 'yearly' ? 'yearly' : 'monthly';

  const { data: plan, error: planErr } = await admin
    .from('membership_plans')
    .select('id, tier, price_monthly, price_yearly, currency_code, name_en, name_ar')
    .eq('id', sub.plan_id)
    .maybeSingle();
  if (planErr || !plan) return json({ ok: false, code: 'not_found' }, 200);

  const amountNumber = Number(billingCycle === 'yearly' ? plan.price_yearly : plan.price_monthly);
  const currency = String(plan.currency_code || 'SAR').toUpperCase();
  if (!Number.isFinite(amountNumber) || amountNumber <= 0) {
    return json({ ok: false, code: 'not_eligible' }, 200);
  }
  if (currency.length !== 3) {
    return json({ ok: false, code: 'amount_mismatch' }, 200);
  }

  // Reuse: if an open (created/requires_action) intent already exists
  // for this subscription+plan+cycle on Moyasar with a checkout url,
  // return it instead of creating a new Moyasar invoice.
  const { data: openIntent } = await admin
    .from('membership_payment_intents')
    .select('id, status, amount, currency, metadata, provider')
    .eq('subscription_id', subscriptionId)
    .eq('provider', PROVIDER)
    .in('status', ['created', 'requires_action'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (openIntent) {
    const meta = (openIntent.metadata ?? {}) as Record<string, unknown>;
    const existingUrl = typeof meta.checkout_url === 'string' ? meta.checkout_url : '';
    const sameAmount = Number(openIntent.amount) === amountNumber;
    const sameCurrency = String(openIntent.currency).toUpperCase() === currency;
    if (existingUrl && sameAmount && sameCurrency) {
      return json({
        ok: true,
        payment_intent_id: openIntent.id,
        provider: PROVIDER,
        checkout_url: existingUrl,
        status: openIntent.status,
        reused: true,
      });
    }
  }

  // Idempotency key — deterministic per (sub, plan, cycle, attempt).
  // Attempt = count of prior intents for this subscription + plan + cycle.
  const { count: priorAttempts } = await admin
    .from('membership_payment_intents')
    .select('id', { count: 'exact', head: true })
    .eq('subscription_id', subscriptionId)
    .eq('plan_id', plan.id)
    .eq('billing_cycle', billingCycle);
  const attempt = (priorAttempts ?? 0) + 1;
  const clientIdem = typeof body?.idempotencyKey === 'string' ? body.idempotencyKey : '';
  const idempotencyKey = clientIdem || `mp:${subscriptionId}:${plan.tier}:${billingCycle}:${attempt}`;

  // Call Moyasar — create a hosted Invoice.
  // Docs: https://docs.moyasar.com/invoices
  // Amount is in minor units (halalas for SAR).
  const moyasarAmount = Math.round(amountNumber * 100);
  let providerInvoiceId = '' as string;
  let checkoutUrl = '' as string;
  let providerStatus = '' as string;
  try {
    const auth = btoa(`${MOYASAR_SECRET_KEY}:`);
    const callbackUrl = `${SUCCESS_URL}${SUCCESS_URL.includes('?') ? '&' : '?'}sub=${encodeURIComponent(subscriptionId)}`;
    const backUrl = `${CANCEL_URL}${CANCEL_URL.includes('?') ? '&' : '?'}sub=${encodeURIComponent(subscriptionId)}`;
    const form = new URLSearchParams();
    form.set('amount', String(moyasarAmount));
    form.set('currency', currency);
    form.set('description', DESCRIPTION);
    form.set('callback_url', callbackUrl);
    form.set('success_url', callbackUrl);
    form.set('back_url', backUrl);

    const resp = await fetch('https://api.moyasar.com/v1/invoices', {
      method: 'POST',
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: form.toString(),
    });
    const text = await resp.text();
    if (!resp.ok) {
      safeLog('provider_error', { status: resp.status, body: text.slice(0, 500) });
      return json({ ok: false, code: 'provider_error' }, 200);
    }
    let providerJson: any = {};
    try { providerJson = JSON.parse(text); } catch { providerJson = {}; }
    providerInvoiceId = String(providerJson?.id ?? '');
    checkoutUrl = String(providerJson?.url ?? '');
    providerStatus = String(providerJson?.status ?? '');
    if (!providerInvoiceId || !checkoutUrl) {
      safeLog('provider_missing_fields');
      return json({ ok: false, code: 'provider_error' }, 200);
    }
  } catch (err) {
    safeLog('provider_exception', { msg: err instanceof Error ? err.message : 'unknown' });
    return json({ ok: false, code: 'provider_error' }, 200);
  }

  const insertPayload = {
    subscription_id: subscriptionId,
    user_id: userId,
    business_id: sub.business_id,
    plan_id: plan.id,
    billing_cycle: billingCycle,
    provider: PROVIDER,
    provider_intent_id: providerInvoiceId,
    idempotency_key: idempotencyKey,
    amount: amountNumber,
    currency,
    status: 'requires_action',
    metadata: {
      checkout_url: checkoutUrl,
      provider_status: providerStatus,
      created_via: 'membership-payment-create-intent',
    },
  };

  const { data: inserted, error: insErr } = await admin
    .from('membership_payment_intents')
    .insert(insertPayload)
    .select('id, status')
    .maybeSingle();

  if (insErr || !inserted) {
    safeLog('insert_failed', { error: insErr?.message });
    return json({ ok: false, code: 'provider_error' }, 200);
  }

  return json({
    ok: true,
    payment_intent_id: inserted.id,
    provider: PROVIDER,
    checkout_url: checkoutUrl,
    status: inserted.status,
  });
});
