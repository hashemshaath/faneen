-- R4F-4-APPLY Phase 1: bilingual in-app notification inserts for membership RPCs.
-- All inserts are idempotent (NOT EXISTS guard on user_id + reference_type + reference_id).
-- No email is sent from SQL. No changes to credits, provider_subscriptions, or RLS.
-- Function signatures and return shapes are preserved.

-- 1) subscribe_to_plan: insert membership_subscription_activated notification
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

  -- R4F-4-APPLY: bilingual activation notification (idempotent).
  INSERT INTO public.notifications
    (user_id, title_ar, title_en, body_ar, body_en, notification_type, reference_type, reference_id, action_url)
  SELECT _user_id,
         'تم تفعيل اشتراكك',
         'Subscription activated',
         'تم تفعيل اشتراكك في باقة ' || COALESCE(_plan.name_ar, _plan.tier::text) || '. يمكنك الاستفادة من المزايا من لوحة التحكم.',
         'Your ' || COALESCE(_plan.name_en, _plan.tier::text) || ' subscription is now active. You can start using benefits from your dashboard.',
         'system',
         'membership_subscription_activated',
         _sub_id,
         '/dashboard/membership'
  WHERE NOT EXISTS (
    SELECT 1 FROM public.notifications n
    WHERE n.user_id = _user_id
      AND n.reference_type = 'membership_subscription_activated'
      AND n.reference_id = _sub_id
  );

  RETURN _sub_id;
END;
$function$;

-- 2) admin_upgrade_subscription: insert membership_subscription_activated notification
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

  -- R4F-4-APPLY: bilingual activation notification (idempotent).
  INSERT INTO public.notifications
    (user_id, title_ar, title_en, body_ar, body_en, notification_type, reference_type, reference_id, action_url)
  SELECT _old_sub.user_id,
         'تم تفعيل اشتراكك',
         'Subscription activated',
         'تم تفعيل اشتراكك في باقة ' || COALESCE(_new_plan.name_ar, _new_plan.tier::text) || ' من قِبل الإدارة.',
         'Your ' || COALESCE(_new_plan.name_en, _new_plan.tier::text) || ' subscription was activated by an administrator.',
         'system',
         'membership_subscription_activated',
         _new_sub_id,
         '/dashboard/membership'
  WHERE NOT EXISTS (
    SELECT 1 FROM public.notifications n
    WHERE n.user_id = _old_sub.user_id
      AND n.reference_type = 'membership_subscription_activated'
      AND n.reference_id = _new_sub_id
  );

  RETURN _new_sub_id;
END;
$function$;

-- 3) admin_set_business_membership_tier: insert tier-changed notification (and activation if a new sub was created)
CREATE OR REPLACE FUNCTION public.admin_set_business_membership_tier(
  _business_id uuid,
  _tier public.membership_tier,
  _reason text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _biz public.businesses%ROWTYPE;
  _plan public.membership_plans%ROWTYPE;
  _old_sub public.membership_subscriptions%ROWTYPE;
  _has_old boolean := false;
  _new_sub_id uuid;
  _cycle text;
  _expires timestamptz;
  _prev_tier public.membership_tier;
BEGIN
  PERFORM set_config('app.membership_rpc', '1', true);

  IF NOT public.has_admin_access(auth.uid()) THEN
    RAISE EXCEPTION 'Admin access required' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO _biz FROM public.businesses WHERE id = _business_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Business not found' USING ERRCODE = 'P0002';
  END IF;
  _prev_tier := _biz.membership_tier;

  SELECT * INTO _plan
  FROM public.membership_plans
  WHERE tier = _tier AND is_active = true
  ORDER BY sort_order
  LIMIT 1;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'No active plan for tier %', _tier USING ERRCODE = 'P0002';
  END IF;

  SELECT * INTO _old_sub
  FROM public.membership_subscriptions
  WHERE business_id = _business_id AND status = 'active'
  ORDER BY created_at DESC
  LIMIT 1;
  _has_old := FOUND;

  IF _has_old AND _old_sub.plan_id = _plan.id AND _prev_tier = _tier THEN
    RETURN jsonb_build_object(
      'business_id', _business_id,
      'tier', _tier,
      'subscription_id', _old_sub.id,
      'previous_subscription_id', _old_sub.id,
      'changed', false
    );
  END IF;

  _cycle := COALESCE(NULLIF(_old_sub.billing_cycle, ''), 'monthly');
  IF _cycle = 'yearly' THEN
    _expires := now() + interval '1 year';
  ELSE
    _expires := now() + interval '1 month';
  END IF;

  IF _has_old THEN
    UPDATE public.membership_subscriptions
       SET status = 'replaced',
           cancelled_at = now(),
           updated_at = now()
     WHERE id = _old_sub.id;
  END IF;

  INSERT INTO public.membership_subscriptions
    (user_id, business_id, plan_id, status, billing_cycle,
     starts_at, expires_at, is_demo, auto_renew)
  VALUES
    (_biz.user_id, _business_id, _plan.id, 'active', _cycle,
     now(), _expires, true, false)
  RETURNING id INTO _new_sub_id;

  UPDATE public.businesses
     SET membership_tier = _tier
   WHERE id = _business_id;

  UPDATE public.profiles
     SET membership_tier = _tier
   WHERE user_id = _biz.user_id;

  INSERT INTO public.admin_activity_log
    (user_id, action, entity_type, entity_id, details)
  VALUES (
    auth.uid(),
    'membership_tier.admin_override',
    'business',
    _business_id,
    jsonb_build_object(
      'previous_tier', _prev_tier,
      'new_tier', _tier,
      'previous_subscription_id', CASE WHEN _has_old THEN _old_sub.id ELSE NULL END,
      'new_subscription_id', _new_sub_id,
      'plan_id', _plan.id,
      'billing_cycle', _cycle,
      'reason', _reason
    )
  );

  -- R4F-4-APPLY: bilingual admin-override notification (idempotent).
  IF _biz.user_id IS NOT NULL THEN
    INSERT INTO public.notifications
      (user_id, title_ar, title_en, body_ar, body_en, notification_type, reference_type, reference_id, action_url)
    SELECT _biz.user_id,
           'تم تحديث باقة منشأتك',
           'Your business plan was updated',
           'قام فريق قِطاعات بتحديث باقة منشأتك من ' || _prev_tier::text || ' إلى ' || _tier::text || '.',
           'The Qitaat team updated your business plan from ' || _prev_tier::text || ' to ' || _tier::text || '.',
           'system',
           'membership_tier_admin_override',
           _new_sub_id,
           '/dashboard/membership'
    WHERE NOT EXISTS (
      SELECT 1 FROM public.notifications n
      WHERE n.user_id = _biz.user_id
        AND n.reference_type = 'membership_tier_admin_override'
        AND n.reference_id = _new_sub_id
    );

    -- Also write an activation notification when the new tier is non-free.
    IF _tier::text <> 'free' THEN
      INSERT INTO public.notifications
        (user_id, title_ar, title_en, body_ar, body_en, notification_type, reference_type, reference_id, action_url)
      SELECT _biz.user_id,
             'تم تفعيل اشتراكك',
             'Subscription activated',
             'تم تفعيل اشتراكك في باقة ' || COALESCE(_plan.name_ar, _plan.tier::text) || '.',
             'Your ' || COALESCE(_plan.name_en, _plan.tier::text) || ' subscription is now active.',
             'system',
             'membership_subscription_activated',
             _new_sub_id,
             '/dashboard/membership'
      WHERE NOT EXISTS (
        SELECT 1 FROM public.notifications n
        WHERE n.user_id = _biz.user_id
          AND n.reference_type = 'membership_subscription_activated'
          AND n.reference_id = _new_sub_id
      );
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'business_id', _business_id,
    'tier', _tier,
    'subscription_id', _new_sub_id,
    'previous_subscription_id', CASE WHEN _has_old THEN _old_sub.id ELSE NULL END,
    'changed', true
  );
END;
$$;

-- 4) cancel_subscription (immediate): insert cancelled-immediately notification
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

  -- R4F-4-APPLY: bilingual immediate-cancel notification (idempotent).
  INSERT INTO public.notifications
    (user_id, title_ar, title_en, body_ar, body_en, notification_type, reference_type, reference_id, action_url)
  SELECT _sub.user_id,
         'تم إلغاء اشتراكك فوراً',
         'Subscription cancelled immediately',
         'تم إلغاء اشتراكك بشكل فوري وعاد حسابك إلى الباقة المجانية.',
         'Your subscription has been cancelled immediately and your account is now on the Free plan.',
         'system',
         'membership_subscription_cancelled_immediately',
         _subscription_id,
         '/membership'
  WHERE NOT EXISTS (
    SELECT 1 FROM public.notifications n
    WHERE n.user_id = _sub.user_id
      AND n.reference_type = 'membership_subscription_cancelled_immediately'
      AND n.reference_id = _subscription_id
  );
END;
$function$;

COMMENT ON FUNCTION public.subscribe_to_plan(uuid, uuid, uuid, text)
  IS 'R4F-4-APPLY: app.membership_rpc marker + idempotent activation notification.';
COMMENT ON FUNCTION public.admin_upgrade_subscription(uuid, uuid, text)
  IS 'R4F-4-APPLY: app.membership_rpc marker + idempotent activation notification.';
COMMENT ON FUNCTION public.admin_set_business_membership_tier(uuid, public.membership_tier, text)
  IS 'R4F-4-APPLY: canonical admin tier override + idempotent admin-override and activation notifications.';
COMMENT ON FUNCTION public.cancel_subscription(uuid)
  IS 'R4F-4-APPLY: app.membership_rpc marker + idempotent immediate-cancel notification.';