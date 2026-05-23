DROP FUNCTION IF EXISTS public.cancel_subscription_at_period_end(uuid);

CREATE OR REPLACE FUNCTION public.cancel_subscription_at_period_end(
  _subscription_id uuid,
  _downgrade_to_plan_id uuid DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _sub public.membership_subscriptions%ROWTYPE;
  _caller uuid := auth.uid();
  _target_tier varchar := 'free';
  _target_plan_id uuid;
  _current_tier varchar;
  _from_tier varchar;
BEGIN
  IF _caller IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT *
  INTO _sub
  FROM public.membership_subscriptions
  WHERE id = _subscription_id
    AND status IN ('active', 'past_due');

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Active subscription not found';
  END IF;

  IF _caller <> _sub.user_id
     AND NOT public.has_admin_access(_caller)
     AND NOT (
       _sub.business_id IS NOT NULL
       AND public.is_business_owner_or_manager(_caller, _sub.business_id)
     ) THEN
    RAISE EXCEPTION 'Not authorized to cancel this subscription';
  END IF;

  SELECT tier
  INTO _current_tier
  FROM public.membership_plans
  WHERE id = _sub.plan_id;

  _from_tier := COALESCE(_current_tier, 'free');

  IF _downgrade_to_plan_id IS NOT NULL THEN
    SELECT tier
    INTO _target_tier
    FROM public.membership_plans
    WHERE id = _downgrade_to_plan_id
      AND status = 'active';

    IF _target_tier IS NULL THEN
      RAISE EXCEPTION 'Invalid downgrade target plan';
    END IF;

    IF array_position(ARRAY['free','basic','premium','enterprise']::varchar[], _target_tier)
       >= array_position(ARRAY['free','basic','premium','enterprise']::varchar[], _current_tier) THEN
      RAISE EXCEPTION 'Downgrade target must be lower than current plan';
    END IF;

    _target_plan_id := _downgrade_to_plan_id;
  ELSE
    SELECT id
    INTO _target_plan_id
    FROM public.membership_plans
    WHERE tier = 'free'
      AND status = 'active'
    ORDER BY created_at ASC
    LIMIT 1;

    IF _target_plan_id IS NULL THEN
      RAISE EXCEPTION 'Active free membership plan not found';
    END IF;

    _target_tier := 'free';
  END IF;

  UPDATE public.membership_subscriptions
  SET auto_renew = false,
      cancelled_at = COALESCE(cancelled_at, now()),
      downgrade_to_tier = _target_tier,
      downgrade_to_plan_id = _target_plan_id,
      updated_at = now()
  WHERE id = _subscription_id;

  INSERT INTO public.membership_subscription_events (
    subscription_id,
    user_id,
    business_id,
    action,
    actor_user_id,
    from_tier,
    to_tier,
    to_plan_id,
    metadata
  )
  SELECT
    _sub.id,
    _sub.user_id,
    _sub.business_id,
    'cancel_at_period_end',
    _caller,
    _from_tier,
    _target_tier,
    _target_plan_id,
    jsonb_build_object(
      'expires_at', _sub.expires_at,
      'cancelled_at', now(),
      'scheduled_at', now(),
      'source', 'cancel_at_period_end'
    )
  WHERE NOT EXISTS (
    SELECT 1
    FROM public.membership_subscription_events e
    WHERE e.subscription_id = _sub.id
      AND e.action = 'cancel_at_period_end'
  );

  INSERT INTO public.notifications (
    user_id,
    title_ar,
    title_en,
    body_ar,
    body_en,
    notification_type,
    reference_type,
    reference_id,
    action_url
  )
  SELECT
    _sub.user_id,
    'تم جدولة إلغاء العضوية',
    'Membership cancellation scheduled',
    'تم جدولة إلغاء العضوية وستبقى المزايا فعالة حتى تاريخ الانتهاء.',
    'Your membership cancellation has been scheduled. Benefits remain active until the expiry date.',
    'system',
    'membership_subscription_cancelled',
    _sub.id,
    '/membership'
  WHERE NOT EXISTS (
    SELECT 1
    FROM public.notifications n
    WHERE n.user_id = _sub.user_id
      AND n.reference_type = 'membership_subscription_cancelled'
      AND n.reference_id = _sub.id
  );
END;
$$;

COMMENT ON FUNCTION public.cancel_subscription_at_period_end(uuid, uuid) IS
  'R4F-2: schedules cancellation at period end, explicitly records downgrade target, event, and idempotent bilingual notification without immediate tier downgrade.';
