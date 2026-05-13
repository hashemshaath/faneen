
-- 1) New columns on subscription
ALTER TABLE public.membership_subscriptions
  ADD COLUMN IF NOT EXISTS downgrade_to_plan_id uuid REFERENCES public.membership_plans(id),
  ADD COLUMN IF NOT EXISTS downgrade_to_tier varchar;

-- 2) Audit table
CREATE TABLE IF NOT EXISTS public.membership_subscription_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id uuid NOT NULL REFERENCES public.membership_subscriptions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  business_id uuid,
  action text NOT NULL CHECK (action IN ('cancel_at_period_end','resume_renewal','downgrade_target_changed','expired_downgraded')),
  actor_user_id uuid,
  from_tier varchar,
  to_tier varchar,
  to_plan_id uuid REFERENCES public.membership_plans(id),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_msub_events_sub ON public.membership_subscription_events(subscription_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_msub_events_user ON public.membership_subscription_events(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_msub_events_action ON public.membership_subscription_events(action, created_at DESC);

ALTER TABLE public.membership_subscription_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own subscription events" ON public.membership_subscription_events;
CREATE POLICY "Users can view own subscription events"
  ON public.membership_subscription_events FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR public.has_admin_access(auth.uid()));

DROP POLICY IF EXISTS "Admins manage subscription events" ON public.membership_subscription_events;
CREATE POLICY "Admins manage subscription events"
  ON public.membership_subscription_events FOR ALL
  TO authenticated
  USING (public.has_admin_access(auth.uid()))
  WITH CHECK (public.has_admin_access(auth.uid()));

-- 3) Replace cancel function: accept downgrade target plan + log event
CREATE OR REPLACE FUNCTION public.cancel_subscription_at_period_end(
  _subscription_id uuid,
  _downgrade_to_plan_id uuid DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _sub membership_subscriptions%ROWTYPE;
  _caller uuid := auth.uid();
  _target_tier varchar := 'free';
  _target_plan_id uuid := NULL;
  _current_tier varchar;
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

  -- Resolve target plan/tier
  IF _downgrade_to_plan_id IS NOT NULL THEN
    SELECT tier INTO _target_tier FROM membership_plans WHERE id = _downgrade_to_plan_id AND is_active = true;
    IF _target_tier IS NULL THEN
      RAISE EXCEPTION 'Invalid downgrade target plan';
    END IF;
    -- Must be strictly lower tier than current plan
    SELECT tier INTO _current_tier FROM membership_plans WHERE id = _sub.plan_id;
    IF array_position(ARRAY['free','basic','premium','enterprise']::varchar[], _target_tier)
       >= array_position(ARRAY['free','basic','premium','enterprise']::varchar[], _current_tier) THEN
      RAISE EXCEPTION 'Downgrade target must be lower than current plan';
    END IF;
    _target_plan_id := _downgrade_to_plan_id;
  END IF;

  UPDATE membership_subscriptions
     SET auto_renew = false,
         cancelled_at = COALESCE(cancelled_at, now()),
         downgrade_to_plan_id = _target_plan_id,
         downgrade_to_tier = _target_tier,
         updated_at = now()
   WHERE id = _subscription_id;

  INSERT INTO membership_subscription_events
    (subscription_id, user_id, business_id, action, actor_user_id, from_tier, to_tier, to_plan_id, metadata)
  VALUES
    (_sub.id, _sub.user_id, _sub.business_id, 'cancel_at_period_end', _caller,
     COALESCE((SELECT tier FROM membership_plans WHERE id = _sub.plan_id), 'free'),
     _target_tier, _target_plan_id,
     jsonb_build_object('expires_at', _sub.expires_at));
END;
$function$;

-- 4) Replace resume function: log event + clear downgrade target
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
         downgrade_to_plan_id = NULL,
         downgrade_to_tier = NULL,
         updated_at = now()
   WHERE id = _subscription_id;

  INSERT INTO membership_subscription_events
    (subscription_id, user_id, business_id, action, actor_user_id, from_tier, to_tier, metadata)
  VALUES
    (_sub.id, _sub.user_id, _sub.business_id, 'resume_renewal', _caller,
     COALESCE((SELECT tier FROM membership_plans WHERE id = _sub.plan_id), 'free'),
     COALESCE((SELECT tier FROM membership_plans WHERE id = _sub.plan_id), 'free'),
     '{}'::jsonb);
END;
$function$;

-- 5) Update process_expired_memberships to honour downgrade target
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
  FOR _sub IN
    SELECT s.id, s.user_id, s.business_id, s.plan_id, s.downgrade_to_tier, s.downgrade_to_plan_id,
           p.tier AS plan_tier, p.name_ar, p.name_en
    FROM membership_subscriptions s
    LEFT JOIN membership_plans p ON p.id = s.plan_id
    WHERE s.status = 'active'
      AND s.expires_at IS NOT NULL
      AND s.expires_at < now()
  LOOP
    _target_tier := COALESCE(_sub.downgrade_to_tier, 'free');

    UPDATE membership_subscriptions
       SET status = 'expired', cancelled_at = COALESCE(cancelled_at, now())
     WHERE id = _sub.id;

    IF _sub.business_id IS NOT NULL THEN
      UPDATE businesses SET membership_tier = _target_tier WHERE id = _sub.business_id;
    END IF;
    UPDATE profiles SET membership_tier = _target_tier WHERE user_id = _sub.user_id;

    INSERT INTO membership_subscription_events
      (subscription_id, user_id, business_id, action, actor_user_id, from_tier, to_tier, to_plan_id, metadata)
    VALUES
      (_sub.id, _sub.user_id, _sub.business_id, 'expired_downgraded', NULL,
       _sub.plan_tier, _target_tier, _sub.downgrade_to_plan_id,
       jsonb_build_object('processed_at', now()));

    INSERT INTO notifications (
      user_id, title_ar, title_en, body_ar, body_en,
      notification_type, reference_type, reference_id, action_url
    )
    SELECT
      _sub.user_id,
      'انتهت صلاحية اشتراكك',
      'Your subscription has expired',
      'انتهت صلاحية باقة ' || COALESCE(_sub.name_ar, '') || '. تم نقل حسابك إلى باقة ' || _target_tier || '.',
      'Your ' || COALESCE(_sub.name_en, '') || ' plan expired. Your account moved to the ' || _target_tier || ' plan.',
      'system',
      'membership_subscription_expired',
      _sub.id,
      '/membership'
    WHERE NOT EXISTS (
      SELECT 1 FROM notifications n
      WHERE n.user_id = _sub.user_id
        AND n.reference_type = 'membership_subscription_expired'
        AND n.reference_id = _sub.id
    );

    _processed := _processed + 1;
    _notified := _notified + 1;
  END LOOP;

  RETURN QUERY SELECT _processed, _notified;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.cancel_subscription_at_period_end(uuid, uuid) TO authenticated;
