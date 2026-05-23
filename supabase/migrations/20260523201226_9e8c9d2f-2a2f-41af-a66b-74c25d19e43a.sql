
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
  -- Transaction-local marker for future enforcement trigger (PHASE-4).
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

  -- Idempotency: same tier + same plan + active sub → no-op.
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

  RETURN jsonb_build_object(
    'business_id', _business_id,
    'tier', _tier,
    'subscription_id', _new_sub_id,
    'previous_subscription_id', CASE WHEN _has_old THEN _old_sub.id ELSE NULL END,
    'changed', true
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_set_business_membership_tier(uuid, public.membership_tier, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_set_business_membership_tier(uuid, public.membership_tier, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.admin_set_business_membership_tier(uuid, public.membership_tier, text) TO authenticated;

COMMENT ON FUNCTION public.admin_set_business_membership_tier(uuid, public.membership_tier, text)
IS 'R4E-2C-4-PHASE-2: canonical membership-owned admin tier override RPC. Does not touch provider_subscriptions or credits.';
