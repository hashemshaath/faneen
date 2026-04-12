
-- Function: subscribe_to_plan
CREATE OR REPLACE FUNCTION public.subscribe_to_plan(
  _user_id uuid,
  _plan_id uuid,
  _business_id uuid DEFAULT NULL,
  _billing_cycle text DEFAULT 'monthly'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _plan membership_plans%ROWTYPE;
  _sub_id uuid;
  _expires timestamp with time zone;
BEGIN
  -- Get plan
  SELECT * INTO _plan FROM membership_plans WHERE id = _plan_id AND is_active = true;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Plan not found or inactive';
  END IF;

  -- Calculate expiry
  IF _billing_cycle = 'yearly' THEN
    _expires := now() + interval '1 year';
  ELSE
    _expires := now() + interval '1 month';
  END IF;

  -- Cancel existing active subscriptions for this user/business
  UPDATE membership_subscriptions
  SET status = 'replaced', cancelled_at = now()
  WHERE user_id = _user_id
    AND status = 'active'
    AND (_business_id IS NULL OR business_id = _business_id);

  -- Create new subscription
  INSERT INTO membership_subscriptions (user_id, plan_id, business_id, billing_cycle, starts_at, expires_at, status)
  VALUES (_user_id, _plan_id, _business_id, _billing_cycle, now(), _expires, 'active')
  RETURNING id INTO _sub_id;

  -- Update business membership_tier
  IF _business_id IS NOT NULL THEN
    UPDATE businesses SET membership_tier = _plan.tier WHERE id = _business_id;
  END IF;

  -- Update profile membership_tier
  UPDATE profiles SET membership_tier = _plan.tier WHERE user_id = _user_id;

  RETURN _sub_id;
END;
$$;

-- Function: cancel_subscription
CREATE OR REPLACE FUNCTION public.cancel_subscription(
  _subscription_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _sub membership_subscriptions%ROWTYPE;
BEGIN
  SELECT * INTO _sub FROM membership_subscriptions WHERE id = _subscription_id AND status = 'active';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Active subscription not found';
  END IF;

  UPDATE membership_subscriptions
  SET status = 'cancelled', cancelled_at = now()
  WHERE id = _subscription_id;

  -- Downgrade to free
  IF _sub.business_id IS NOT NULL THEN
    UPDATE businesses SET membership_tier = 'free' WHERE id = _sub.business_id;
  END IF;
  UPDATE profiles SET membership_tier = 'free' WHERE user_id = _sub.user_id;
END;
$$;

-- Function: admin_upgrade_subscription (admin-only upgrade)
CREATE OR REPLACE FUNCTION public.admin_upgrade_subscription(
  _subscription_id uuid,
  _new_plan_id uuid,
  _billing_cycle text DEFAULT 'monthly'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _old_sub membership_subscriptions%ROWTYPE;
  _new_plan membership_plans%ROWTYPE;
  _new_sub_id uuid;
  _expires timestamp with time zone;
BEGIN
  -- Validate caller is admin
  IF NOT has_admin_access(auth.uid()) THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;

  SELECT * INTO _old_sub FROM membership_subscriptions WHERE id = _subscription_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Subscription not found';
  END IF;

  SELECT * INTO _new_plan FROM membership_plans WHERE id = _new_plan_id AND is_active = true;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Plan not found or inactive';
  END IF;

  -- Calculate expiry
  IF _billing_cycle = 'yearly' THEN
    _expires := now() + interval '1 year';
  ELSE
    _expires := now() + interval '1 month';
  END IF;

  -- Mark old as replaced
  UPDATE membership_subscriptions
  SET status = 'replaced', cancelled_at = now()
  WHERE id = _subscription_id;

  -- Create new subscription
  INSERT INTO membership_subscriptions (user_id, plan_id, business_id, billing_cycle, starts_at, expires_at, status)
  VALUES (_old_sub.user_id, _new_plan_id, _old_sub.business_id, _billing_cycle, now(), _expires, 'active')
  RETURNING id INTO _new_sub_id;

  -- Update tiers
  IF _old_sub.business_id IS NOT NULL THEN
    UPDATE businesses SET membership_tier = _new_plan.tier WHERE id = _old_sub.business_id;
  END IF;
  UPDATE profiles SET membership_tier = _new_plan.tier WHERE user_id = _old_sub.user_id;

  RETURN _new_sub_id;
END;
$$;
