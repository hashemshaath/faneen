
-- Cancel subscription at period end: keep status='active', disable auto_renew,
-- mark cancelled_at. Renewal job will downgrade once expires_at is reached.
CREATE OR REPLACE FUNCTION public.cancel_subscription_at_period_end(_subscription_id uuid)
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
  WHERE id = _subscription_id AND status IN ('active','past_due');
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
  SET auto_renew = false,
      cancelled_at = COALESCE(cancelled_at, now()),
      updated_at = now()
  WHERE id = _subscription_id;
END;
$function$;

-- Resume auto-renewal for a subscription cancelled at period end.
CREATE OR REPLACE FUNCTION public.resume_subscription_renewal(_subscription_id uuid)
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
  WHERE id = _subscription_id AND status IN ('active','past_due');
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Active subscription not found';
  END IF;

  IF _caller <> _sub.user_id
     AND NOT public.has_admin_access(_caller)
     AND NOT (_sub.business_id IS NOT NULL
              AND public.is_business_owner_or_manager(_caller, _sub.business_id)) THEN
    RAISE EXCEPTION 'Not authorized to modify this subscription';
  END IF;

  UPDATE membership_subscriptions
  SET auto_renew = true,
      cancelled_at = NULL,
      updated_at = now()
  WHERE id = _subscription_id;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.cancel_subscription_at_period_end(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.resume_subscription_renewal(uuid) TO authenticated;
