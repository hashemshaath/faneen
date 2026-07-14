
-- M3 — Honest membership lifecycle (Path B: no tokenized recurring charges available)
-- 1) process_renewal_failures: extend grace from 3 → 7 days, clarify copy
-- 2) process_expired_memberships: skip auto_renew subs (they flow through process_renewal_failures)
--    and defensively skip anything still inside grace_period_until
-- 3) notify_expiring_memberships: add 1-day reminder (keep 3d/7d)

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
    -- HONEST GRACE: 7 days. No tokenized auto-charge is configured, so the
    -- subscriber must manually renew during this window.
    v_grace_until := now() + interval '7 days';

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
             'grace_days', 7,
             'tier', r.tier,
             'reason', 'auto_renewal_not_configured',
             'started_at', now()
           )
    WHERE NOT EXISTS (
      SELECT 1 FROM public.membership_subscription_events e
      WHERE e.subscription_id = r.id AND e.action = 'renewal_grace_started'
    );

    -- Idempotent notification (7-day honest copy)
    INSERT INTO public.notifications
      (user_id, title_ar, title_en, body_ar, body_en, notification_type, reference_type, reference_id, action_url)
    SELECT r.user_id, 'انتهى اشتراكك — فترة سماح 7 أيام', 'Subscription expired — 7-day grace period',
      'انتهت صلاحية اشتراكك. لديك 7 أيام لتجديده يدوياً قبل تحويل حسابك للباقة المجانية.',
      'Your subscription has expired. You have 7 days to renew manually before your account moves to Free.',
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

-- ---------------------------------------------------------------------------
-- process_expired_memberships: HONOR grace window and cede auto_renew subs
-- to process_renewal_failures. Only manual/non-auto_renew subscriptions and
-- already-past-grace rows fall through to a direct expire+downgrade here.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.process_expired_memberships()
 RETURNS TABLE(processed_count integer, notified_count integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _sub record;
  _processed integer := 0;
  _notified integer := 0;
  _target_tier varchar;
BEGIN
  PERFORM set_config('app.membership_rpc', '1', true);
  FOR _sub IN
    SELECT s.id, s.user_id, s.business_id, s.plan_id, s.downgrade_to_tier, s.downgrade_to_plan_id,
           p.tier AS plan_tier, p.name_ar, p.name_en
    FROM membership_subscriptions s
    LEFT JOIN membership_plans p ON p.id = s.plan_id
    WHERE s.status = 'active'
      AND s.expires_at IS NOT NULL
      AND s.expires_at < now()
      -- Honor grace window: skip anything still inside grace (defensive; grace
      -- rows are past_due, but a race could leave them active for a moment).
      AND (s.grace_period_until IS NULL OR s.grace_period_until < now())
      -- Auto-renew subscriptions belong to process_renewal_failures — that
      -- function walks them into past_due + a 7-day grace instead of
      -- immediate expiry. Only manual (auto_renew=false) subs expire here.
      AND s.auto_renew = false
  LOOP
    _target_tier := COALESCE(_sub.downgrade_to_tier, 'free');
    UPDATE membership_subscriptions SET status = 'expired', cancelled_at = COALESCE(cancelled_at, now()) WHERE id = _sub.id;
    IF _sub.business_id IS NOT NULL THEN
      UPDATE businesses SET membership_tier = _target_tier WHERE id = _sub.business_id;
    END IF;
    UPDATE profiles SET membership_tier = _target_tier WHERE user_id = _sub.user_id;
    INSERT INTO membership_subscription_events
      (subscription_id, user_id, business_id, action, actor_user_id, from_tier, to_tier, to_plan_id, metadata)
    VALUES (_sub.id, _sub.user_id, _sub.business_id, 'expired_downgraded', NULL,
            _sub.plan_tier, _target_tier, _sub.downgrade_to_plan_id, jsonb_build_object('processed_at', now(), 'source', 'process_expired_memberships'));
    INSERT INTO notifications (user_id, title_ar, title_en, body_ar, body_en, notification_type, reference_type, reference_id, action_url)
    SELECT _sub.user_id, 'انتهت صلاحية اشتراكك', 'Your subscription has expired',
      'انتهت صلاحية باقة ' || COALESCE(_sub.name_ar, '') || '. تم نقل حسابك إلى باقة ' || _target_tier || '.',
      'Your ' || COALESCE(_sub.name_en, '') || ' plan expired. Your account moved to the ' || _target_tier || ' plan.',
      'system', 'membership_subscription_expired', _sub.id, '/membership'
    WHERE NOT EXISTS (SELECT 1 FROM notifications n WHERE n.user_id = _sub.user_id
      AND n.reference_type = 'membership_subscription_expired' AND n.reference_id = _sub.id);
    _processed := _processed + 1;
    _notified := _notified + 1;
  END LOOP;
  RETURN QUERY SELECT _processed, _notified;
END;
$function$;

-- ---------------------------------------------------------------------------
-- notify_expiring_memberships: add a 1-day reminder tier (keep 3d and 7d)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.notify_expiring_memberships()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _row record;
  _days_left integer;
  _threshold integer;
  _ref_type text;
  _count integer := 0;
BEGIN
  FOR _row IN
    SELECT s.id, s.user_id, s.expires_at,
           p.name_ar, p.name_en
    FROM membership_subscriptions s
    LEFT JOIN membership_plans p ON p.id = s.plan_id
    WHERE s.status = 'active'
      AND s.expires_at IS NOT NULL
      AND s.expires_at > now()
      AND s.expires_at <= now() + interval '7 days'
  LOOP
    _days_left := GREATEST(0, CEIL(EXTRACT(EPOCH FROM (_row.expires_at - now())) / 86400)::integer);

    IF _days_left <= 1 THEN
      _threshold := 1;
      _ref_type := 'membership_subscription_expiring_1d';
    ELSIF _days_left <= 3 THEN
      _threshold := 3;
      _ref_type := 'membership_subscription_expiring_3d';
    ELSE
      _threshold := 7;
      _ref_type := 'membership_subscription_expiring_7d';
    END IF;

    INSERT INTO notifications (
      user_id, title_ar, title_en, body_ar, body_en,
      notification_type, reference_type, reference_id, action_url
    )
    SELECT _row.user_id,
      'تذكير بتجديد اشتراكك',
      'Renew your subscription',
      'ينتهي اشتراكك خلال ' || _days_left || ' يوم. جدّد الآن للاحتفاظ بمزاياك.',
      'Your subscription ends in ' || _days_left || ' day(s). Renew now to keep your benefits.',
      'system', _ref_type, _row.id, '/membership'
    WHERE NOT EXISTS (
      SELECT 1 FROM notifications n
      WHERE n.user_id = _row.user_id
        AND n.reference_type = _ref_type
        AND n.reference_id   = _row.id
    );

    IF FOUND THEN _count := _count + 1; END IF;
  END LOOP;

  RETURN _count;
END;
$function$;
