-- pgTAP tests for cancel_subscription_at_period_end (R4F-2)
-- Run with: supabase test db
BEGIN;

CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;
SET search_path = public, extensions;

SELECT plan(18);

-- ── Fixtures ──────────────────────────────────────────────────────────────
DO $$
DECLARE
  _user uuid := gen_random_uuid();
  _stranger uuid := gen_random_uuid();
  _free_plan uuid;
  _basic_plan uuid;
  _premium_plan uuid;
  _sub uuid := gen_random_uuid();
BEGIN
  SELECT id INTO _free_plan FROM public.membership_plans WHERE tier='free' AND status='active' ORDER BY created_at LIMIT 1;
  SELECT id INTO _basic_plan FROM public.membership_plans WHERE tier='basic' AND status='active' ORDER BY created_at LIMIT 1;
  SELECT id INTO _premium_plan FROM public.membership_plans WHERE tier='premium' AND status='active' ORDER BY created_at LIMIT 1;

  PERFORM set_config('app.test_user', _user::text, true);
  PERFORM set_config('app.test_stranger', _stranger::text, true);
  PERFORM set_config('app.test_free_plan', _free_plan::text, true);
  PERFORM set_config('app.test_basic_plan', _basic_plan::text, true);
  PERFORM set_config('app.test_premium_plan', _premium_plan::text, true);
  PERFORM set_config('app.test_sub', _sub::text, true);

  INSERT INTO public.membership_subscriptions (id, user_id, plan_id, status, billing_cycle, auto_renew, started_at, expires_at)
  VALUES (_sub, _user, _premium_plan, 'active', 'monthly', true, now(), now() + interval '20 days');

  PERFORM set_config('request.jwt.claim.sub', _user::text, true);
END $$;

-- ── 1. Auth negative ──────────────────────────────────────────────────────
SELECT set_config('request.jwt.claim.sub', current_setting('app.test_stranger'), true);
SELECT throws_ok(
  format($f$SELECT public.cancel_subscription_at_period_end('%s'::uuid, NULL)$f$, current_setting('app.test_sub')),
  'Not authorized to cancel this subscription',
  'stranger cannot cancel'
);

-- ── 2. Owner cancels with default (free) target ──────────────────────────
SELECT set_config('request.jwt.claim.sub', current_setting('app.test_user'), true);
SELECT lives_ok(
  format($f$SELECT public.cancel_subscription_at_period_end('%s'::uuid, NULL)$f$, current_setting('app.test_sub')),
  'owner can cancel at period end'
);

SELECT is((SELECT status FROM public.membership_subscriptions WHERE id = current_setting('app.test_sub')::uuid), 'active'::text, 'status remains active');
SELECT is((SELECT auto_renew FROM public.membership_subscriptions WHERE id = current_setting('app.test_sub')::uuid), false, 'auto_renew=false');
SELECT isnt((SELECT cancelled_at FROM public.membership_subscriptions WHERE id = current_setting('app.test_sub')::uuid), NULL, 'cancelled_at set');
SELECT is((SELECT downgrade_to_tier FROM public.membership_subscriptions WHERE id = current_setting('app.test_sub')::uuid)::text, 'free', 'downgrade_to_tier=free');
SELECT is((SELECT downgrade_to_plan_id FROM public.membership_subscriptions WHERE id = current_setting('app.test_sub')::uuid), current_setting('app.test_free_plan')::uuid, 'downgrade_to_plan_id=free plan');

-- ── 3. Event row ──────────────────────────────────────────────────────────
SELECT is(
  (SELECT count(*)::int FROM public.membership_subscription_events WHERE subscription_id = current_setting('app.test_sub')::uuid AND action='cancel_at_period_end'),
  1, 'one cancel_at_period_end event');

SELECT is(
  (SELECT to_tier::text FROM public.membership_subscription_events WHERE subscription_id = current_setting('app.test_sub')::uuid AND action='cancel_at_period_end' LIMIT 1),
  'free', 'event to_tier=free');

-- ── 4. Notification row (bilingual) ───────────────────────────────────────
SELECT is(
  (SELECT count(*)::int FROM public.notifications WHERE reference_type='membership_subscription_cancelled' AND reference_id = current_setting('app.test_sub')::uuid),
  1, 'one cancellation notification');

SELECT isnt((SELECT title_ar FROM public.notifications WHERE reference_type='membership_subscription_cancelled' AND reference_id = current_setting('app.test_sub')::uuid LIMIT 1), NULL, 'title_ar present');
SELECT isnt((SELECT title_en FROM public.notifications WHERE reference_type='membership_subscription_cancelled' AND reference_id = current_setting('app.test_sub')::uuid LIMIT 1), NULL, 'title_en present');
SELECT isnt((SELECT body_ar FROM public.notifications WHERE reference_type='membership_subscription_cancelled' AND reference_id = current_setting('app.test_sub')::uuid LIMIT 1), NULL, 'body_ar present');
SELECT isnt((SELECT body_en FROM public.notifications WHERE reference_type='membership_subscription_cancelled' AND reference_id = current_setting('app.test_sub')::uuid LIMIT 1), NULL, 'body_en present');

-- ── 5. Idempotency ────────────────────────────────────────────────────────
SELECT lives_ok(
  format($f$SELECT public.cancel_subscription_at_period_end('%s'::uuid, NULL)$f$, current_setting('app.test_sub')),
  'second call lives'
);
SELECT is(
  (SELECT count(*)::int FROM public.membership_subscription_events WHERE subscription_id = current_setting('app.test_sub')::uuid AND action='cancel_at_period_end'),
  1, 'no duplicate event');
SELECT is(
  (SELECT count(*)::int FROM public.notifications WHERE reference_type='membership_subscription_cancelled' AND reference_id = current_setting('app.test_sub')::uuid),
  1, 'no duplicate notification');

-- ── 6. Custom downgrade target rejects same-or-higher ────────────────────
SELECT throws_ok(
  format($f$SELECT public.cancel_subscription_at_period_end('%s'::uuid, '%s'::uuid)$f$, current_setting('app.test_sub'), current_setting('app.test_premium_plan')),
  'Downgrade target must be lower than current plan',
  'same-tier target rejected'
);

-- ── 7. Expiry flow ────────────────────────────────────────────────────────
UPDATE public.membership_subscriptions SET expires_at = now() - interval '1 hour' WHERE id = current_setting('app.test_sub')::uuid;
SELECT lives_ok($$SELECT public.process_expired_memberships()$$, 'process_expired_memberships runs');
SELECT is((SELECT status FROM public.membership_subscriptions WHERE id = current_setting('app.test_sub')::uuid), 'expired'::text, 'subscription expired');

SELECT * FROM finish();
ROLLBACK;