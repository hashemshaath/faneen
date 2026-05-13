
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Fix process_renewal_failures notifications schema
CREATE OR REPLACE FUNCTION public.process_renewal_failures()
RETURNS TABLE(grace_started integer, downgraded integer, notified integer)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_grace integer := 0;
  v_down integer := 0;
  v_notif integer := 0;
  r record;
BEGIN
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
    UPDATE public.membership_subscriptions
       SET status = 'past_due',
           grace_period_until = now() + interval '3 days',
           last_renewal_attempt_at = now(),
           renewal_failure_count = renewal_failure_count + 1,
           payment_failure_reason = COALESCE(payment_failure_reason, 'auto_renewal_not_configured')
     WHERE id = r.id;
    v_grace := v_grace + 1;

    INSERT INTO public.notifications
      (user_id, title_ar, title_en, body_ar, body_en, notification_type, reference_type, reference_id, action_url)
    VALUES (
      r.user_id,
      'فشل تجديد الاشتراك',
      'Subscription renewal failed',
      'لم نتمكن من تجديد اشتراكك. لديك 3 أيام لتجديده يدوياً قبل العودة للباقة المجانية.',
      'We could not renew your subscription. You have 3 days to renew manually before downgrading to Free.',
      'system',
      'membership_renewal_failed',
      r.id,
      '/membership'
    );
    v_notif := v_notif + 1;
  END LOOP;

  FOR r IN
    SELECT s.id, s.user_id, s.business_id, p.tier
    FROM public.membership_subscriptions s
    JOIN public.membership_plans p ON p.id = s.plan_id
    WHERE s.status = 'past_due'
      AND s.grace_period_until IS NOT NULL
      AND s.grace_period_until < now()
  LOOP
    UPDATE public.membership_subscriptions
       SET status = 'expired',
           cancelled_at = COALESCE(cancelled_at, now())
     WHERE id = r.id;

    IF r.business_id IS NOT NULL THEN
      UPDATE public.businesses SET membership_tier = 'free' WHERE id = r.business_id;
    END IF;
    UPDATE public.profiles SET membership_tier = 'free' WHERE user_id = r.user_id;

    v_down := v_down + 1;

    INSERT INTO public.notifications
      (user_id, title_ar, title_en, body_ar, body_en, notification_type, reference_type, reference_id, action_url)
    VALUES (
      r.user_id,
      'انتهى الاشتراك',
      'Subscription expired',
      'انتهت فترة السماح ولم يتم التجديد. تم تحويل حسابك إلى الباقة المجانية.',
      'Grace period ended without renewal. Your account is now on the Free plan.',
      'system',
      'membership_subscription_expired',
      r.id,
      '/membership'
    );
    v_notif := v_notif + 1;
  END LOOP;

  RETURN QUERY SELECT v_grace, v_down, v_notif;
END $$;

REVOKE ALL ON FUNCTION public.process_renewal_failures() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.process_renewal_failures() TO service_role;

-- Fix redeem_promo_code notifications schema
CREATE OR REPLACE FUNCTION public.redeem_promo_code(_code text, _business_id uuid DEFAULT NULL)
RETURNS TABLE(success boolean, message text, subscription_id uuid)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  c record;
  v_plan_id uuid;
  v_sub_id uuid;
  v_expires timestamptz;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'unauthenticated'; END IF;

  SELECT * INTO c FROM public.membership_promo_codes
   WHERE code = upper(_code) AND is_active = true FOR UPDATE;

  IF c.id IS NULL THEN
    RETURN QUERY SELECT false, 'invalid_code'::text, NULL::uuid; RETURN;
  END IF;
  IF c.valid_from > now() OR (c.valid_until IS NOT NULL AND c.valid_until < now()) THEN
    RETURN QUERY SELECT false, 'expired'::text, NULL::uuid; RETURN;
  END IF;
  IF c.used_count >= c.max_redemptions THEN
    RETURN QUERY SELECT false, 'fully_redeemed'::text, NULL::uuid; RETURN;
  END IF;
  IF EXISTS (SELECT 1 FROM public.membership_promo_redemptions WHERE promo_code_id = c.id AND user_id = v_uid) THEN
    RETURN QUERY SELECT false, 'already_redeemed'::text, NULL::uuid; RETURN;
  END IF;

  IF c.type = 'free_upgrade' AND c.target_tier IS NOT NULL THEN
    SELECT id INTO v_plan_id FROM public.membership_plans WHERE tier = c.target_tier AND is_active = true;
    IF v_plan_id IS NULL THEN
      RETURN QUERY SELECT false, 'plan_unavailable'::text, NULL::uuid; RETURN;
    END IF;

    v_expires := now() + make_interval(days => COALESCE(c.duration_days, 30));

    UPDATE public.membership_subscriptions
       SET status='replaced', cancelled_at = now()
     WHERE user_id = v_uid
       AND status IN ('active','past_due')
       AND (_business_id IS NULL OR business_id = _business_id);

    INSERT INTO public.membership_subscriptions
      (user_id, business_id, plan_id, status, billing_cycle, starts_at, expires_at, payment_method, auto_renew)
    VALUES
      (v_uid, _business_id, v_plan_id, 'active', 'monthly', now(), v_expires, 'promo_code', false)
    RETURNING id INTO v_sub_id;

    IF _business_id IS NOT NULL THEN
      UPDATE public.businesses SET membership_tier = c.target_tier WHERE id = _business_id;
    END IF;
    UPDATE public.profiles SET membership_tier = c.target_tier WHERE user_id = v_uid;
  END IF;

  INSERT INTO public.membership_promo_redemptions (promo_code_id, user_id, business_id, applied_subscription_id)
  VALUES (c.id, v_uid, _business_id, v_sub_id);

  UPDATE public.membership_promo_codes SET used_count = used_count + 1 WHERE id = c.id;

  INSERT INTO public.notifications
    (user_id, title_ar, title_en, body_ar, body_en, notification_type, reference_type, reference_id, action_url)
  VALUES (
    v_uid,
    'تم تفعيل الكود الترويجي',
    'Promo code activated',
    'تم تفعيل اشتراكك بنجاح عبر الكود الترويجي.',
    'Your subscription has been activated via promo code.',
    'system',
    'membership_promo_redeemed',
    v_sub_id,
    '/membership'
  );

  RETURN QUERY SELECT true, 'redeemed'::text, v_sub_id;
END $$;

GRANT EXECUTE ON FUNCTION public.redeem_promo_code(text, uuid) TO authenticated;
