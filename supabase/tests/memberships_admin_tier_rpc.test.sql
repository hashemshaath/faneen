-- R4E-2C-4-PHASE-2 pgTAP coverage for admin_set_business_membership_tier
-- Run with: psql -f supabase/tests/memberships_admin_tier_rpc.test.sql
BEGIN;
SELECT plan(14);

-- ---------------------------------------------------------------------------
-- Fixtures
-- ---------------------------------------------------------------------------
-- Pick an existing business owned by a real user; create a throwaway admin
-- and non-admin auth context using has_admin_access. We rely on existing
-- membership_plans rows seeded for each tier (verified in PHASE-1 audit).

DO $$
DECLARE
  _biz_id uuid;
  _owner uuid;
  _admin uuid := gen_random_uuid();
  _user  uuid := gen_random_uuid();
BEGIN
  SELECT id, user_id INTO _biz_id, _owner FROM public.businesses ORDER BY created_at LIMIT 1;
  PERFORM set_config('tests.biz_id', _biz_id::text, true);
  PERFORM set_config('tests.owner_id', _owner::text, true);
  PERFORM set_config('tests.admin_id', _admin::text, true);
  PERFORM set_config('tests.user_id',  _user::text,  true);
END $$;

-- ---------------------------------------------------------------------------
-- 1. Function exists with expected signature
-- ---------------------------------------------------------------------------
SELECT has_function(
  'public', 'admin_set_business_membership_tier',
  ARRAY['uuid','public.membership_tier','text'],
  'admin_set_business_membership_tier(uuid, membership_tier, text) exists'
);

SELECT is(
  pg_catalog.pg_get_function_result(
    (SELECT oid FROM pg_proc
      WHERE proname='admin_set_business_membership_tier'
        AND pronamespace = 'public'::regnamespace)),
  'jsonb',
  'returns jsonb'
);

-- ---------------------------------------------------------------------------
-- 2. Anon cannot execute (permission denied: function not granted to anon)
-- ---------------------------------------------------------------------------
SELECT ok(
  NOT has_function_privilege(
    'anon',
    'public.admin_set_business_membership_tier(uuid, public.membership_tier, text)',
    'execute'),
  'anon role does NOT have EXECUTE on RPC'
);

SELECT ok(
  has_function_privilege(
    'authenticated',
    'public.admin_set_business_membership_tier(uuid, public.membership_tier, text)',
    'execute'),
  'authenticated role HAS EXECUTE on RPC'
);

-- ---------------------------------------------------------------------------
-- 3. Non-admin caller is rejected with 42501
-- ---------------------------------------------------------------------------
SELECT throws_ok(
  format(
    $q$ SELECT set_config('request.jwt.claims', json_build_object('sub','%s','role','authenticated')::text, true);
        SELECT public.admin_set_business_membership_tier('%s'::uuid,'premium'::public.membership_tier,'unit-test'); $q$,
    current_setting('tests.user_id'),
    current_setting('tests.biz_id')
  ),
  '42501',
  NULL,
  'non-admin authenticated caller rejected (42501)'
);

-- ---------------------------------------------------------------------------
-- 4. Admin caller can override tier (changed:true) and mirrors propagate
-- ---------------------------------------------------------------------------
-- Promote test admin via user_roles (relies on existing has_admin_access fn).
INSERT INTO public.user_roles (user_id, role)
VALUES (current_setting('tests.admin_id')::uuid, 'admin')
ON CONFLICT DO NOTHING;

-- Snapshot provider credits to verify untouched.
DO $$
BEGIN
  PERFORM set_config(
    'tests.ps_count_before',
    (SELECT COUNT(*)::text FROM public.provider_subscriptions),
    true
  );
  PERFORM set_config(
    'tests.ps_credits_sum_before',
    COALESCE((SELECT SUM(lead_credits_balance)::text FROM public.provider_subscriptions), '0'),
    true
  );
END $$;

-- Set admin JWT and invoke RPC.
SELECT set_config(
  'request.jwt.claims',
  json_build_object('sub', current_setting('tests.admin_id'), 'role','authenticated')::text,
  true
);

-- First call: set to 'basic' to guarantee a change (PHASE-1 left BIZ-5000001 as premium).
SELECT lives_ok(
  format($q$ SELECT public.admin_set_business_membership_tier('%s'::uuid,'basic'::public.membership_tier,'pgtap-change'); $q$,
         current_setting('tests.biz_id')),
  'admin can invoke RPC for tier change'
);

SELECT is(
  (SELECT membership_tier::text FROM public.businesses WHERE id = current_setting('tests.biz_id')::uuid),
  'basic',
  'businesses.membership_tier mirrored'
);

SELECT ok(
  EXISTS (
    SELECT 1 FROM public.membership_subscriptions
     WHERE business_id = current_setting('tests.biz_id')::uuid
       AND status='active'
  ),
  'active membership_subscriptions row exists post-change'
);

SELECT ok(
  EXISTS (
    SELECT 1 FROM public.admin_activity_log
     WHERE action='membership_tier.admin_override'
       AND entity_id = current_setting('tests.biz_id')::uuid
       AND details ? 'reason'
       AND details->>'reason' = 'pgtap-change'
  ),
  'admin_activity_log row written with reason'
);

-- ---------------------------------------------------------------------------
-- 5. Idempotency: same tier + same plan → changed:false, no new sub, no log
-- ---------------------------------------------------------------------------
DO $$
DECLARE _before bigint; _after bigint; _logs_before bigint; _logs_after bigint; _res jsonb;
BEGIN
  SELECT COUNT(*) INTO _before FROM public.membership_subscriptions
    WHERE business_id = current_setting('tests.biz_id')::uuid;
  SELECT COUNT(*) INTO _logs_before FROM public.admin_activity_log
    WHERE action='membership_tier.admin_override'
      AND entity_id = current_setting('tests.biz_id')::uuid;

  SELECT public.admin_set_business_membership_tier(
    current_setting('tests.biz_id')::uuid,
    'basic'::public.membership_tier,
    'pgtap-noop'
  ) INTO _res;

  SELECT COUNT(*) INTO _after FROM public.membership_subscriptions
    WHERE business_id = current_setting('tests.biz_id')::uuid;
  SELECT COUNT(*) INTO _logs_after FROM public.admin_activity_log
    WHERE action='membership_tier.admin_override'
      AND entity_id = current_setting('tests.biz_id')::uuid;

  PERFORM set_config('tests.noop_changed', (_res->>'changed'), true);
  PERFORM set_config('tests.noop_delta_subs', (_after - _before)::text, true);
  PERFORM set_config('tests.noop_delta_logs', (_logs_after - _logs_before)::text, true);
END $$;

SELECT is(current_setting('tests.noop_changed'), 'false', 'idempotent call returns changed:false');
SELECT is(current_setting('tests.noop_delta_subs'), '0', 'no new subscription row on idempotent call');
SELECT is(current_setting('tests.noop_delta_logs'), '0', 'no admin_activity_log row on idempotent call');

-- ---------------------------------------------------------------------------
-- 6. provider_subscriptions / lead_credits untouched
-- ---------------------------------------------------------------------------
SELECT is(
  (SELECT COUNT(*)::text FROM public.provider_subscriptions),
  current_setting('tests.ps_count_before'),
  'provider_subscriptions row count unchanged'
);

SELECT is(
  COALESCE((SELECT SUM(lead_credits_balance)::text FROM public.provider_subscriptions), '0'),
  current_setting('tests.ps_credits_sum_before'),
  'provider_subscriptions.lead_credits_balance sum unchanged'
);

-- ---------------------------------------------------------------------------
-- NOTE: T13 enforcement (direct businesses.membership_tier writes blocked
-- outside app.membership_rpc='1') stays in TODO_GAP_G3 until PHASE-4.
-- The marker is set by the RPC but its visibility outside the function call
-- is transaction-local; deferred to the enforcement phase to assert.
-- ---------------------------------------------------------------------------

SELECT * FROM finish();
ROLLBACK;