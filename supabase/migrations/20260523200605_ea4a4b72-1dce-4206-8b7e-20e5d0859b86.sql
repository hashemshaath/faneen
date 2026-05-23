-- R4E-2C-4-PHASE-1: membership tier RPC marker + orphan backfill (retry with explicit text casts on tier comparisons)

CREATE OR REPLACE FUNCTION public.admin_upgrade_subscription(_subscription_id uuid, _new_plan_id uuid, _billing_cycle text DEFAULT 'monthly'::text)
 RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  _old_sub membership_subscriptions%ROWTYPE;
  _new_plan membership_plans%ROWTYPE;
  _new_sub_id uuid;
  _expires timestamp with time zone;
BEGIN
  PERFORM set_config('app.membership_rpc', '1', true);
  IF NOT has_admin_access(auth.uid()) THEN RAISE EXCEPTION 'Admin access required'; END IF;
  IF _billing_cycle IS NULL OR _billing_cycle NOT IN ('monthly', 'yearly') THEN
    RAISE EXCEPTION 'Invalid billing_cycle: must be monthly or yearly';
  END IF;
  SELECT * INTO _old_sub FROM membership_subscriptions WHERE id = _subscription_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Subscription not found'; END IF;
  SELECT * INTO _new_plan FROM membership_plans WHERE id = _new_plan_id AND is_active = true;
  IF NOT FOUND THEN RAISE EXCEPTION 'Plan not found or inactive'; END IF;
  IF _billing_cycle = 'yearly' THEN _expires := now() + interval '1 year';
  ELSE _expires := now() + interval '1 month'; END IF;
  UPDATE membership_subscriptions SET status = 'replaced', cancelled_at = now() WHERE id = _subscription_id;
  INSERT INTO membership_subscriptions (user_id, plan_id, business_id, billing_cycle, starts_at, expires_at, status)
  VALUES (_old_sub.user_id, _new_plan_id, _old_sub.business_id, _billing_cycle, now(), _expires, 'active')
  RETURNING id INTO _new_sub_id;
  IF _old_sub.business_id IS NOT NULL THEN
    UPDATE businesses SET membership_tier = _new_plan.tier WHERE id = _old_sub.business_id;
  END IF;
  UPDATE profiles SET membership_tier = _new_plan.tier WHERE user_id = _old_sub.user_id;
  RETURN _new_sub_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.subscribe_to_plan(_user_id uuid, _plan_id uuid, _business_id uuid DEFAULT NULL::uuid, _billing_cycle text DEFAULT 'monthly'::text)
 RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  _plan membership_plans%ROWTYPE;
  _sub_id uuid;
  _expires timestamp with time zone;
  _caller uuid := auth.uid();
  _is_admin boolean;
BEGIN
  PERFORM set_config('app.membership_rpc', '1', true);
  IF _caller IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  IF _billing_cycle NOT IN ('monthly', 'yearly') THEN RAISE EXCEPTION 'Invalid billing cycle: must be monthly or yearly'; END IF;
  _is_admin := public.has_admin_access(_caller);
  IF _caller <> _user_id AND NOT _is_admin THEN RAISE EXCEPTION 'Not authorized to subscribe for another user'; END IF;
  IF _business_id IS NOT NULL THEN
    IF NOT _is_admin AND NOT public.is_business_owner_or_manager(_caller, _business_id) THEN
      RAISE EXCEPTION 'Not authorized for this business';
    END IF;
    IF NOT public.is_business_owner_or_manager(_user_id, _business_id) THEN
      RAISE EXCEPTION 'Target user is not owner or manager of this business';
    END IF;
  END IF;
  SELECT * INTO _plan FROM membership_plans WHERE id = _plan_id AND is_active = true;
  IF NOT FOUND THEN RAISE EXCEPTION 'Plan not found or inactive'; END IF;
  IF _billing_cycle = 'yearly' THEN _expires := now() + interval '1 year';
  ELSE _expires := now() + interval '1 month'; END IF;
  UPDATE membership_subscriptions SET status = 'replaced', cancelled_at = now()
   WHERE user_id = _user_id AND status = 'active' AND (_business_id IS NULL OR business_id = _business_id);
  INSERT INTO membership_subscriptions (user_id, plan_id, business_id, billing_cycle, starts_at, expires_at, status)
  VALUES (_user_id, _plan_id, _business_id, _billing_cycle, now(), _expires, 'active')
  RETURNING id INTO _sub_id;
  IF _business_id IS NOT NULL THEN
    UPDATE businesses SET membership_tier = _plan.tier WHERE id = _business_id;
  END IF;
  UPDATE profiles SET membership_tier = _plan.tier WHERE user_id = _user_id;
  RETURN _sub_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.redeem_promo_code(_code text, _business_id uuid DEFAULT NULL::uuid)
 RETURNS TABLE(success boolean, message text, subscription_id uuid)
 LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  c record;
  v_plan_id uuid;
  v_sub_id uuid;
  v_expires timestamptz;
  v_code text := upper(_code);
  v_reason text;
BEGIN
  PERFORM set_config('app.membership_rpc', '1', true);
  IF v_uid IS NULL THEN RAISE EXCEPTION 'unauthenticated'; END IF;
  SELECT * INTO c FROM public.membership_promo_codes WHERE code = v_code FOR UPDATE;
  IF c.id IS NULL THEN
    INSERT INTO public.membership_promo_code_attempts (code, user_id, business_id, success, rejection_reason)
    VALUES (v_code, v_uid, _business_id, false, 'invalid_code');
    RETURN QUERY SELECT false, 'invalid_code'::text, NULL::uuid; RETURN;
  END IF;
  IF NOT c.is_active THEN v_reason := 'inactive';
  ELSIF c.valid_from > now() THEN v_reason := 'not_started';
  ELSIF c.valid_until IS NOT NULL AND c.valid_until < now() THEN v_reason := 'expired';
  ELSIF c.used_count >= c.max_redemptions THEN v_reason := 'fully_redeemed';
  ELSIF EXISTS (SELECT 1 FROM public.membership_promo_redemptions WHERE promo_code_id = c.id AND user_id = v_uid) THEN
    v_reason := 'already_redeemed';
  END IF;
  IF v_reason IS NOT NULL THEN
    INSERT INTO public.membership_promo_code_attempts (code, promo_code_id, user_id, business_id, success, rejection_reason)
    VALUES (v_code, c.id, v_uid, _business_id, false, v_reason);
    RETURN QUERY SELECT false, v_reason, NULL::uuid; RETURN;
  END IF;
  IF c.type = 'free_upgrade' AND c.target_tier IS NOT NULL THEN
    SELECT id INTO v_plan_id FROM public.membership_plans WHERE tier = c.target_tier AND is_active = true;
    IF v_plan_id IS NULL THEN
      INSERT INTO public.membership_promo_code_attempts (code, promo_code_id, user_id, business_id, success, rejection_reason)
      VALUES (v_code, c.id, v_uid, _business_id, false, 'plan_unavailable');
      RETURN QUERY SELECT false, 'plan_unavailable'::text, NULL::uuid; RETURN;
    END IF;
    v_expires := now() + make_interval(days => COALESCE(c.duration_days, 30));
    UPDATE public.membership_subscriptions SET status='replaced', cancelled_at = now()
     WHERE user_id = v_uid AND status IN ('active','past_due')
       AND (_business_id IS NULL OR business_id = _business_id);
    INSERT INTO public.membership_subscriptions
      (user_id, business_id, plan_id, status, billing_cycle, starts_at, expires_at, payment_method, auto_renew)
    VALUES (v_uid, _business_id, v_plan_id, 'active', 'monthly', now(), v_expires, 'promo_code', false)
    RETURNING id INTO v_sub_id;
    IF _business_id IS NOT NULL THEN
      UPDATE public.businesses SET membership_tier = c.target_tier WHERE id = _business_id;
    END IF;
    UPDATE public.profiles SET membership_tier = c.target_tier WHERE user_id = v_uid;
  END IF;
  INSERT INTO public.membership_promo_redemptions (promo_code_id, user_id, business_id, applied_subscription_id)
  VALUES (c.id, v_uid, _business_id, v_sub_id);
  UPDATE public.membership_promo_codes SET used_count = used_count + 1 WHERE id = c.id;
  INSERT INTO public.membership_promo_code_attempts
    (code, promo_code_id, user_id, business_id, success, rejection_reason, applied_subscription_id)
  VALUES (v_code, c.id, v_uid, _business_id, true, NULL, v_sub_id);
  INSERT INTO public.notifications
    (user_id, title_ar, title_en, body_ar, body_en, notification_type, reference_type, reference_id, action_url)
  VALUES (v_uid,'تم تفعيل الكود الترويجي','Promo code activated',
    'تم تفعيل اشتراكك بنجاح عبر الكود الترويجي.','Your subscription has been activated via promo code.',
    'system','membership_promo_redeemed', v_sub_id, '/membership');
  RETURN QUERY SELECT true, 'redeemed'::text, v_sub_id;
END $function$;

CREATE OR REPLACE FUNCTION public.cancel_subscription(_subscription_id uuid)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  _sub membership_subscriptions%ROWTYPE;
  _caller uuid := auth.uid();
BEGIN
  PERFORM set_config('app.membership_rpc', '1', true);
  IF _caller IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  SELECT * INTO _sub FROM membership_subscriptions WHERE id = _subscription_id AND status = 'active';
  IF NOT FOUND THEN RAISE EXCEPTION 'Active subscription not found'; END IF;
  IF _caller <> _sub.user_id AND NOT public.has_admin_access(_caller)
     AND NOT (_sub.business_id IS NOT NULL AND public.is_business_owner_or_manager(_caller, _sub.business_id)) THEN
    RAISE EXCEPTION 'Not authorized to cancel this subscription';
  END IF;
  UPDATE membership_subscriptions SET status = 'cancelled', cancelled_at = now() WHERE id = _subscription_id;
  IF _sub.business_id IS NOT NULL THEN
    UPDATE businesses SET membership_tier = 'free' WHERE id = _sub.business_id;
  END IF;
  UPDATE profiles SET membership_tier = 'free' WHERE user_id = _sub.user_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.process_expired_memberships()
 RETURNS TABLE(processed_count integer, notified_count integer)
 LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
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
    WHERE s.status = 'active' AND s.expires_at IS NOT NULL AND s.expires_at < now()
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
            _sub.plan_tier, _target_tier, _sub.downgrade_to_plan_id, jsonb_build_object('processed_at', now()));
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

CREATE OR REPLACE FUNCTION public.process_renewal_failures()
 RETURNS TABLE(grace_started integer, downgraded integer, notified integer)
 LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  v_grace integer := 0;
  v_down integer := 0;
  v_notif integer := 0;
  r record;
BEGIN
  PERFORM set_config('app.membership_rpc', '1', true);
  FOR r IN
    SELECT s.id, s.user_id, s.business_id, s.plan_id, p.tier
    FROM public.membership_subscriptions s
    JOIN public.membership_plans p ON p.id = s.plan_id
    WHERE s.status = 'active' AND s.auto_renew = true AND s.expires_at IS NOT NULL
      AND s.expires_at < now() AND s.grace_period_until IS NULL AND p.tier <> 'free'
  LOOP
    UPDATE public.membership_subscriptions
       SET status = 'past_due', grace_period_until = now() + interval '3 days',
           last_renewal_attempt_at = now(), renewal_failure_count = renewal_failure_count + 1,
           payment_failure_reason = COALESCE(payment_failure_reason, 'auto_renewal_not_configured')
     WHERE id = r.id;
    v_grace := v_grace + 1;
    INSERT INTO public.notifications (user_id, title_ar, title_en, body_ar, body_en, notification_type, reference_type, reference_id, action_url)
    VALUES (r.user_id, 'فشل تجديد الاشتراك', 'Subscription renewal failed',
      'لم نتمكن من تجديد اشتراكك. لديك 3 أيام لتجديده يدوياً قبل العودة للباقة المجانية.',
      'We could not renew your subscription. You have 3 days to renew manually before downgrading to Free.',
      'system', 'membership_renewal_failed', r.id, '/membership');
    v_notif := v_notif + 1;
  END LOOP;
  FOR r IN
    SELECT s.id, s.user_id, s.business_id, p.tier
    FROM public.membership_subscriptions s
    JOIN public.membership_plans p ON p.id = s.plan_id
    WHERE s.status = 'past_due' AND s.grace_period_until IS NOT NULL AND s.grace_period_until < now()
  LOOP
    UPDATE public.membership_subscriptions
       SET status = 'expired', cancelled_at = COALESCE(cancelled_at, now()) WHERE id = r.id;
    IF r.business_id IS NOT NULL THEN
      UPDATE public.businesses SET membership_tier = 'free' WHERE id = r.business_id;
    END IF;
    UPDATE public.profiles SET membership_tier = 'free' WHERE user_id = r.user_id;
    v_down := v_down + 1;
    INSERT INTO public.notifications (user_id, title_ar, title_en, body_ar, body_en, notification_type, reference_type, reference_id, action_url)
    VALUES (r.user_id, 'انتهى الاشتراك', 'Subscription expired',
      'انتهت فترة السماح ولم يتم التجديد. تم تحويل حسابك إلى الباقة المجانية.',
      'Grace period ended without renewal. Your account is now on the Free plan.',
      'system', 'membership_subscription_expired', r.id, '/membership');
    v_notif := v_notif + 1;
  END LOOP;
  RETURN QUERY SELECT v_grace, v_down, v_notif;
END $function$;

COMMENT ON FUNCTION public.admin_upgrade_subscription(uuid, uuid, text)        IS 'R4E-2C-4-PHASE-1: sets app.membership_rpc marker.';
COMMENT ON FUNCTION public.subscribe_to_plan(uuid, uuid, uuid, text)           IS 'R4E-2C-4-PHASE-1: sets app.membership_rpc marker.';
COMMENT ON FUNCTION public.redeem_promo_code(text, uuid)                       IS 'R4E-2C-4-PHASE-1: sets app.membership_rpc marker.';
COMMENT ON FUNCTION public.cancel_subscription(uuid)                           IS 'R4E-2C-4-PHASE-1: sets app.membership_rpc marker.';
COMMENT ON FUNCTION public.process_expired_memberships()                       IS 'R4E-2C-4-PHASE-1: sets app.membership_rpc marker.';
COMMENT ON FUNCTION public.process_renewal_failures()                          IS 'R4E-2C-4-PHASE-1: sets app.membership_rpc marker.';

-- M2: idempotent orphan backfill. Compare tiers with explicit casts on both
-- sides to avoid enum-vs-text operator ambiguity.
INSERT INTO public.membership_subscriptions
  (user_id, business_id, plan_id, status, billing_cycle, starts_at, expires_at, is_demo)
SELECT
  b.user_id,
  b.id,
  (
    SELECT mp.id
    FROM public.membership_plans mp
    WHERE mp.tier::text = b.membership_tier::text
      AND mp.is_active = true
    LIMIT 1
  ),
  'active', 'monthly', now(), now() + interval '1 month', true
FROM public.businesses b
LEFT JOIN public.membership_subscriptions ms
  ON ms.business_id = b.id AND ms.status = 'active'
WHERE b.membership_tier::text <> 'free'
  AND ms.id IS NULL
  AND b.user_id IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.membership_plans mp
    WHERE mp.tier::text = b.membership_tier::text AND mp.is_active = true
  );