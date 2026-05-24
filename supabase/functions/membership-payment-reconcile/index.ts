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
  if (claimsErr || !claimsRes?.claims?.sub) {
    return json({ ok: false, code: 'unauthorized' }, 401);
  }
  const callerId = claimsRes.claims.sub as string;

  let body: any;
  try { body = await req.json(); } catch { return json({ ok: false, code: 'invalid_body' }, 400); }
  const intentId = typeof body?.intentId === 'string' ? body.intentId : '';
  const providerIntentId =
    typeof body?.providerIntentId === 'string' ? body.providerIntentId : '';
  if (!intentId && !providerIntentId) {
    return json({ ok: false, code: 'invalid_body' }, 400);
  }

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

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