CREATE OR REPLACE FUNCTION public.subscribe_to_plan(
  _user_id uuid, _plan_id uuid,
  _business_id uuid DEFAULT NULL::uuid,
  _billing_cycle text DEFAULT 'monthly'::text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _plan membership_plans%ROWTYPE;
  _sub_id uuid;
  _expires timestamp with time zone;
  _caller uuid := auth.uid();
  _is_admin boolean;
BEGIN
  IF _caller IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF _billing_cycle NOT IN ('monthly', 'yearly') THEN
    RAISE EXCEPTION 'Invalid billing cycle: must be monthly or yearly';
  END IF;

  _is_admin := public.has_admin_access(_caller);

  -- Caller may only act for themselves, unless admin
  IF _caller <> _user_id AND NOT _is_admin THEN
    RAISE EXCEPTION 'Not authorized to subscribe for another user';
  END IF;

  -- Business-scoped: caller must own/manage business (admins exempt),
  -- and target user must also be owner/manager of that business.
  IF _business_id IS NOT NULL THEN
    IF NOT _is_admin AND NOT public.is_business_owner_or_manager(_caller, _business_id) THEN
      RAISE EXCEPTION 'Not authorized for this business';
    END IF;
    IF NOT public.is_business_owner_or_manager(_user_id, _business_id) THEN
      RAISE EXCEPTION 'Target user is not owner or manager of this business';
    END IF;
  END IF;

  SELECT * INTO _plan FROM membership_plans WHERE id = _plan_id AND is_active = true;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Plan not found or inactive';
  END IF;

  IF _billing_cycle = 'yearly' THEN
    _expires := now() + interval '1 year';
  ELSE
    _expires := now() + interval '1 month';
  END IF;

  UPDATE membership_subscriptions
  SET status = 'replaced', cancelled_at = now()
  WHERE user_id = _user_id
    AND status = 'active'
    AND (_business_id IS NULL OR business_id = _business_id);

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

CREATE OR REPLACE FUNCTION public.cancel_subscription(_subscription_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _sub membership_subscriptions%ROWTYPE;
  _caller uuid := auth.uid();
BEGIN
  IF _caller IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT * INTO _sub FROM membership_subscriptions
  WHERE id = _subscription_id AND status = 'active';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Active subscription not found';
  END IF;

  IF _caller <> _sub.user_id
     AND NOT public.has_admin_access(_caller)
     AND NOT (_sub.business_id IS NOT NULL
              AND public.is_business_owner_or_manager(_caller, _sub.business_id)) THEN
    RAISE EXCEPTION 'Not authorized to cancel this subscription';
  END IF;

  UPDATE membership_subscriptions
  SET status = 'cancelled', cancelled_at = now()
  WHERE id = _subscription_id;

  IF _sub.business_id IS NOT NULL THEN
    UPDATE businesses SET membership_tier = 'free' WHERE id = _sub.business_id;
  END IF;
  UPDATE profiles SET membership_tier = 'free' WHERE user_id = _sub.user_id;
END;
$function$;