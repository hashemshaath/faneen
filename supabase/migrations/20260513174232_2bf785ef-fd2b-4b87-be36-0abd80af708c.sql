
CREATE TABLE IF NOT EXISTS public.membership_access_key_usage_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  access_key_id uuid NOT NULL REFERENCES public.membership_access_keys(id) ON DELETE CASCADE,
  business_id uuid REFERENCES public.businesses(id) ON DELETE SET NULL,
  user_id uuid,
  endpoint text,
  method text,
  status_code integer,
  ip text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_aku_log_key ON public.membership_access_key_usage_log (access_key_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_aku_log_business ON public.membership_access_key_usage_log (business_id, created_at DESC);

ALTER TABLE public.membership_access_key_usage_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins view all access key usage" ON public.membership_access_key_usage_log
  FOR SELECT TO authenticated USING (has_admin_access(auth.uid()));
CREATE POLICY "Owners view business access key usage" ON public.membership_access_key_usage_log
  FOR SELECT TO authenticated USING (
    business_id IS NOT NULL AND is_business_owner_or_manager(auth.uid(), business_id)
  );
CREATE POLICY "Users view own key usage" ON public.membership_access_key_usage_log
  FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.record_access_key_usage(
  _key_prefix text,
  _endpoint text DEFAULT NULL,
  _method text DEFAULT NULL,
  _status_code integer DEFAULT NULL,
  _ip text DEFAULT NULL,
  _user_agent text DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE k record; v_log_id uuid;
BEGIN
  SELECT id, user_id, business_id INTO k
    FROM public.membership_access_keys
   WHERE key_prefix = _key_prefix
     AND revoked_at IS NULL
     AND (expires_at IS NULL OR expires_at > now())
   LIMIT 1;
  IF k.id IS NULL THEN RETURN NULL; END IF;

  INSERT INTO public.membership_access_key_usage_log
    (access_key_id, business_id, user_id, endpoint, method, status_code, ip, user_agent)
  VALUES (k.id, k.business_id, k.user_id, _endpoint, _method, _status_code, _ip, _user_agent)
  RETURNING id INTO v_log_id;

  UPDATE public.membership_access_keys SET last_used_at = now() WHERE id = k.id;
  RETURN v_log_id;
END $$;

GRANT EXECUTE ON FUNCTION public.record_access_key_usage(text, text, text, integer, text, text) TO authenticated, anon, service_role;

CREATE TABLE IF NOT EXISTS public.membership_promo_code_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL,
  promo_code_id uuid REFERENCES public.membership_promo_codes(id) ON DELETE SET NULL,
  user_id uuid,
  business_id uuid REFERENCES public.businesses(id) ON DELETE SET NULL,
  success boolean NOT NULL,
  rejection_reason text,
  applied_subscription_id uuid REFERENCES public.membership_subscriptions(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_promo_attempts_code ON public.membership_promo_code_attempts (promo_code_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_promo_attempts_user ON public.membership_promo_code_attempts (user_id, created_at DESC);

ALTER TABLE public.membership_promo_code_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins view all promo attempts" ON public.membership_promo_code_attempts
  FOR SELECT TO authenticated USING (has_admin_access(auth.uid()));
CREATE POLICY "Users view own promo attempts" ON public.membership_promo_code_attempts
  FOR SELECT TO authenticated USING (user_id = auth.uid());

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
  v_code text := upper(_code);
  v_reason text;
BEGIN
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
    INSERT INTO public.membership_promo_code_attempts
      (code, promo_code_id, user_id, business_id, success, rejection_reason)
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

    UPDATE public.membership_subscriptions
       SET status='replaced', cancelled_at = now()
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
END $$;

GRANT EXECUTE ON FUNCTION public.redeem_promo_code(text, uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_promo_code_status(_code_id uuid)
RETURNS TABLE(status text, used_count integer, max_redemptions integer, remaining integer)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    CASE
      WHEN NOT c.is_active THEN 'inactive'
      WHEN c.valid_from > now() THEN 'not_started'
      WHEN c.valid_until IS NOT NULL AND c.valid_until < now() THEN 'expired'
      WHEN c.used_count >= c.max_redemptions THEN 'fully_redeemed'
      WHEN c.used_count > 0 THEN 'partially_used'
      ELSE 'active'
    END AS status,
    c.used_count, c.max_redemptions,
    GREATEST(c.max_redemptions - c.used_count, 0) AS remaining
  FROM public.membership_promo_codes c WHERE c.id = _code_id;
$$;

GRANT EXECUTE ON FUNCTION public.get_promo_code_status(uuid) TO authenticated;
