CREATE OR REPLACE FUNCTION public.admin_upgrade_subscription(_subscription_id uuid, _new_plan_id uuid, _billing_cycle text DEFAULT 'monthly'::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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

  -- Validate billing cycle (reject NULL, empty, or anything other than monthly/yearly)
  IF _billing_cycle IS NULL OR _billing_cycle NOT IN ('monthly', 'yearly') THEN
    RAISE EXCEPTION 'Invalid billing_cycle: must be monthly or yearly';
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
$function$;