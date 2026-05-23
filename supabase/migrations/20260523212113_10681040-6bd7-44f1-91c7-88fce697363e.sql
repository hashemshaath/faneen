-- Extend allowed actions on membership_subscription_events to include grace start
ALTER TABLE public.membership_subscription_events
  DROP CONSTRAINT IF EXISTS membership_subscription_events_action_check;

ALTER TABLE public.membership_subscription_events
  ADD CONSTRAINT membership_subscription_events_action_check
  CHECK (action = ANY (ARRAY[
    'cancel_at_period_end'::text,
    'resume_renewal'::text,
    'downgrade_target_changed'::text,
    'expired_downgraded'::text,
    'renewal_grace_started'::text
  ]));

-- Replace process_renewal_failures: idempotent events + honor downgrade_to_tier/plan
CREATE OR REPLACE FUNCTION public.process_renewal_failures()
 RETURNS TABLE(grace_started integer, downgraded integer, notified integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_grace integer := 0;
  v_down  integer := 0;
  v_notif integer := 0;
  r record;
  v_target_tier    varchar;
  v_target_plan_id uuid;
  v_grace_until    timestamptz;
BEGIN
  PERFORM set_config('app.membership_rpc', '1', true);

  -- 1) Grace start: active auto_renew non-free past expiry, not yet in grace
  FOR r IN
    SELECT s.id, s.user_id, s.business_id, s.plan_id, p.tier
    FROM public.membership_subscriptions s
    JOIN public.membership_plans p ON p.id = s.plan_id
    WHERE s.status = 'active'
      AND s.auto_renew = true
      AND s.expires_at IS NOT NULL
      AND s.expires_at < now()
      AND s.grace_period_until IS NULL
      AND p.tier <> 'free'
  LOOP
    v_grace_until := now() + interval '3 days';

    UPDATE public.membership_subscriptions
       SET status                  = 'past_due',
           grace_period_until      = v_grace_until,
           last_renewal_attempt_at = now(),
           renewal_failure_count   = renewal_failure_count + 1,
           payment_failure_reason  = COALESCE(payment_failure_reason, 'auto_renewal_not_configured')
     WHERE id = r.id;

    v_grace := v_grace + 1;

    -- Idempotent grace-start event
    INSERT INTO public.membership_subscription_events
      (subscription_id, user_id, business_id, action, actor_user_id, from_tier, to_tier, to_plan_id, metadata)
    SELECT r.id, r.user_id, r.business_id, 'renewal_grace_started', NULL,
           r.tier, r.tier, r.plan_id,
           jsonb_build_object(
             'grace_period_ends_at', v_grace_until,
             'tier', r.tier,
             'reason', 'auto_renewal_not_configured',
             'started_at', now()
           )
    WHERE NOT EXISTS (
      SELECT 1 FROM public.membership_subscription_events e
      WHERE e.subscription_id = r.id AND e.action = 'renewal_grace_started'
    );

    -- Idempotent notification
    INSERT INTO public.notifications
      (user_id, title_ar, title_en, body_ar, body_en, notification_type, reference_type, reference_id, action_url)
    SELECT r.user_id, 'فشل تجديد الاشتراك', 'Subscription renewal failed',
      'لم نتمكن من تجديد اشتراكك. لديك 3 أيام لتجديده يدوياً قبل العودة للباقة المجانية.',
      'We could not renew your subscription. You have 3 days to renew manually before downgrading to Free.',
      'system', 'membership_renewal_failed', r.id, '/membership'
    WHERE NOT EXISTS (
      SELECT 1 FROM public.notifications n
      WHERE n.user_id = r.user_id
        AND n.reference_type = 'membership_renewal_failed'
        AND n.reference_id   = r.id
    );

    IF FOUND THEN v_notif := v_notif + 1; END IF;
  END LOOP;

  -- 2) Final downgrade: grace expired
  FOR r IN
    SELECT s.id, s.user_id, s.business_id, s.plan_id, s.grace_period_until,
           s.downgrade_to_tier, s.downgrade_to_plan_id,
           p.tier AS from_tier, p.name_ar, p.name_en
    FROM public.membership_subscriptions s
    JOIN public.membership_plans p ON p.id = s.plan_id
    WHERE s.status = 'past_due'
      AND s.grace_period_until IS NOT NULL
      AND s.grace_period_until < now()
  LOOP
    v_target_tier := COALESCE(r.downgrade_to_tier, 'free');

    IF r.downgrade_to_plan_id IS NOT NULL THEN
      v_target_plan_id := r.downgrade_to_plan_id;
    ELSE
      SELECT id INTO v_target_plan_id
        FROM public.membership_plans
       WHERE tier = v_target_tier AND status = 'active'
       ORDER BY created_at ASC
       LIMIT 1;
    END IF;

    UPDATE public.membership_subscriptions
       SET status       = 'expired',
           cancelled_at = COALESCE(cancelled_at, now())
     WHERE id = r.id;

    IF r.business_id IS NOT NULL THEN
      UPDATE public.businesses
         SET membership_tier = v_target_tier
       WHERE id = r.business_id;
    END IF;

    UPDATE public.profiles
       SET membership_tier = v_target_tier
     WHERE user_id = r.user_id;

    v_down := v_down + 1;

    -- Idempotent downgrade event
    INSERT INTO public.membership_subscription_events
      (subscription_id, user_id, business_id, action, actor_user_id, from_tier, to_tier, to_plan_id, metadata)
    SELECT r.id, r.user_id, r.business_id, 'expired_downgraded', NULL,
           r.from_tier, v_target_tier, v_target_plan_id,
           jsonb_build_object(
             'grace_period_ended_at', r.grace_period_until,
             'processed_at', now(),
             'source', 'process_renewal_failures',
             'from_plan_id', r.plan_id
           )
    WHERE NOT EXISTS (
      SELECT 1 FROM public.membership_subscription_events e
      WHERE e.subscription_id = r.id AND e.action = 'expired_downgraded'
    );

    -- Idempotent notification
    INSERT INTO public.notifications
      (user_id, title_ar, title_en, body_ar, body_en, notification_type, reference_type, reference_id, action_url)
    SELECT r.user_id, 'انتهى الاشتراك', 'Subscription expired',
      'انتهت فترة السماح ولم يتم التجديد. تم تحويل حسابك إلى باقة ' || v_target_tier || '.',
      'Grace period ended without renewal. Your account is now on the ' || v_target_tier || ' plan.',
      'system', 'membership_subscription_expired', r.id, '/membership'
    WHERE NOT EXISTS (
      SELECT 1 FROM public.notifications n
      WHERE n.user_id = r.user_id
        AND n.reference_type = 'membership_subscription_expired'
        AND n.reference_id   = r.id
    );

    IF FOUND THEN v_notif := v_notif + 1; END IF;
  END LOOP;

  RETURN QUERY SELECT v_grace, v_down, v_notif;
END
$function$;