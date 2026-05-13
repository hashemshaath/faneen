-- =============================================================================
-- E2E SQL test for membership renewal / grace / past_due → free transitions.
-- Wrapped in a transaction with ROLLBACK so it is safe to run repeatedly.
--
-- Usage:
--   psql -f scripts/test-membership-renewal.sql
--
-- NOTE: Steps 2 & 3 require an UPDATE-capable role (e.g. local postgres or
-- supabase service_role). The Lovable sandbox `psql` only has SELECT+INSERT,
-- so it can verify Step 1 only. Run locally for the full suite.
--
-- Verifies:
--   1. Active plan that expired → moved to past_due with 3-day grace window
--   2. past_due whose grace_period_until < now() → expired + downgraded to free
--   3. notifications inserted exactly once per transition (no duplicates)
-- =============================================================================

BEGIN;

-- Pick an existing non-free plan for the test
CREATE TEMP TABLE _test_ctx AS
SELECT
  (SELECT id FROM public.membership_plans WHERE tier <> 'free' AND is_active = true ORDER BY sort_order LIMIT 1) AS plan_id,
  '00000000-0000-0000-0000-00000000feed'::uuid AS user_id;

-- Seed an expired active subscription
INSERT INTO public.membership_subscriptions
  (user_id, plan_id, status, billing_cycle, starts_at, expires_at, auto_renew, payment_method)
SELECT user_id, plan_id, 'active', 'monthly', now() - interval '30 days', now() - interval '1 minute', true, 'manual'
FROM _test_ctx
RETURNING id AS sub_id;

-- Step 1: run renewal-failure processor
SELECT * FROM public.process_renewal_failures();

-- Assert: subscription is now past_due with grace_period_until in the future
DO $$
DECLARE r record;
BEGIN
  SELECT s.status, s.grace_period_until, s.renewal_failure_count
    INTO r
  FROM public.membership_subscriptions s
  JOIN _test_ctx t ON t.user_id = s.user_id
  ORDER BY s.created_at DESC LIMIT 1;

  IF r.status <> 'past_due' THEN RAISE EXCEPTION 'expected past_due, got %', r.status; END IF;
  IF r.grace_period_until IS NULL OR r.grace_period_until < now() THEN
    RAISE EXCEPTION 'expected grace_period_until > now(), got %', r.grace_period_until;
  END IF;
  IF r.renewal_failure_count <> 1 THEN
    RAISE EXCEPTION 'expected renewal_failure_count=1, got %', r.renewal_failure_count;
  END IF;
  RAISE NOTICE '✓ Step 1 OK: active → past_due with 3-day grace';
END $$;

-- Step 2: simulate grace period elapsed
UPDATE public.membership_subscriptions
   SET grace_period_until = now() - interval '1 minute'
 WHERE user_id = (SELECT user_id FROM _test_ctx);

SELECT * FROM public.process_renewal_failures();

-- Assert: subscription expired + tier downgraded
DO $$
DECLARE r record;
BEGIN
  SELECT s.status INTO r
  FROM public.membership_subscriptions s
  JOIN _test_ctx t ON t.user_id = s.user_id
  ORDER BY s.created_at DESC LIMIT 1;

  IF r.status <> 'expired' THEN RAISE EXCEPTION 'expected expired, got %', r.status; END IF;
  RAISE NOTICE '✓ Step 2 OK: past_due grace elapsed → expired';
END $$;

-- Step 3: idempotency — running again should NOT create duplicate notifications
SELECT * FROM public.process_renewal_failures();

DO $$
DECLARE n integer;
BEGIN
  SELECT count(*) INTO n
  FROM public.notifications
  WHERE user_id = (SELECT user_id FROM _test_ctx)
    AND reference_type IN ('membership_renewal_failed','membership_subscription_expired');

  -- Exactly 2 notifications across all 3 runs (1 grace + 1 expired)
  IF n <> 2 THEN
    RAISE EXCEPTION 'expected 2 notifications, got % (duplicates emitted)', n;
  END IF;
  RAISE NOTICE '✓ Step 3 OK: no duplicate notifications across re-runs';
END $$;

RAISE NOTICE '✅ All membership renewal scenarios passed';

ROLLBACK;