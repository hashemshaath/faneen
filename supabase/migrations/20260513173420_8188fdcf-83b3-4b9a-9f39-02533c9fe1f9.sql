
-- ============================================================================
-- 1. SUBSCRIPTION RENEWAL/FAILURE COLUMNS
-- ============================================================================
ALTER TABLE public.membership_subscriptions
  ADD COLUMN IF NOT EXISTS auto_renew boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS last_renewal_attempt_at timestamptz,
  ADD COLUMN IF NOT EXISTS renewal_failure_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS grace_period_until timestamptz,
  ADD COLUMN IF NOT EXISTS payment_failure_reason text;

CREATE INDEX IF NOT EXISTS idx_membership_subs_renewal
  ON public.membership_subscriptions (status, expires_at, auto_renew)
  WHERE status IN ('active','past_due');

-- ============================================================================
-- 2. has_membership_feature()
-- ============================================================================
CREATE OR REPLACE FUNCTION public.has_membership_feature(
  _user_id uuid,
  _feature_key text,
  _business_id uuid DEFAULT NULL
) RETURNS boolean
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_limits jsonb;
  v_val jsonb;
BEGIN
  v_limits := public.get_active_membership_limits(_user_id, _business_id);
  v_val := v_limits -> _feature_key;
  IF v_val IS NULL THEN RETURN false; END IF;
  IF jsonb_typeof(v_val) = 'boolean' THEN RETURN (v_val)::text::boolean; END IF;
  IF jsonb_typeof(v_val) = 'number' THEN RETURN (v_val::text)::numeric > 0; END IF;
  RETURN false;
END $$;

GRANT EXECUTE ON FUNCTION public.has_membership_feature(uuid, text, uuid) TO authenticated;

-- ============================================================================
-- 3. RENEWAL FAILURE PROCESSOR
-- ============================================================================
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
  -- Step 1: Active subs that expired with auto_renew=true and no grace period yet → start grace (3 days)
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

    INSERT INTO public.notifications (user_id, type, title, message, data, action_url)
    VALUES (
      r.user_id,
      'membership_renewal_failed',
      'فشل تجديد الاشتراك',
      'لم نتمكن من تجديد اشتراكك. لديك 3 أيام لتجديده يدوياً قبل العودة للباقة المجانية.',
      jsonb_build_object('subscription_id', r.id, 'tier', r.tier, 'grace_until', (now() + interval '3 days')),
      '/membership'
    )
    ON CONFLICT DO NOTHING;
    v_notif := v_notif + 1;
  END LOOP;

  -- Step 2: past_due subs whose grace period also expired → downgrade to free
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

    -- downgrade businesses + profile
    IF r.business_id IS NOT NULL THEN
      UPDATE public.businesses SET membership_tier = 'free' WHERE id = r.business_id;
    END IF;
    UPDATE public.profiles SET membership_tier = 'free' WHERE user_id = r.user_id;

    v_down := v_down + 1;

    INSERT INTO public.notifications (user_id, type, title, message, data, action_url)
    VALUES (
      r.user_id,
      'membership_subscription_expired',
      'انتهى الاشتراك',
      'انتهت فترة السماح ولم يتم التجديد. تم تحويل حسابك إلى الباقة المجانية.',
      jsonb_build_object('subscription_id', r.id, 'previous_tier', r.tier),
      '/membership'
    )
    ON CONFLICT DO NOTHING;
    v_notif := v_notif + 1;
  END LOOP;

  RETURN QUERY SELECT v_grace, v_down, v_notif;
END $$;

REVOKE ALL ON FUNCTION public.process_renewal_failures() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.process_renewal_failures() TO service_role;

-- ============================================================================
-- 4. INVITE KEYS (staff joining business under same plan)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.membership_invite_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  subscription_id uuid REFERENCES public.membership_subscriptions(id) ON DELETE SET NULL,
  code text NOT NULL UNIQUE,
  role business_staff_role NOT NULL DEFAULT 'viewer',
  max_uses integer NOT NULL DEFAULT 1 CHECK (max_uses > 0),
  used_count integer NOT NULL DEFAULT 0,
  expires_at timestamptz,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','revoked','expired','exhausted')),
  notes text,
  created_by uuid NOT NULL,
  revoked_at timestamptz,
  revoke_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_invite_keys_business ON public.membership_invite_keys (business_id);
CREATE INDEX IF NOT EXISTS idx_invite_keys_code ON public.membership_invite_keys (code);
CREATE INDEX IF NOT EXISTS idx_invite_keys_status ON public.membership_invite_keys (status, expires_at);

CREATE TABLE IF NOT EXISTS public.membership_invite_redemptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invite_key_id uuid NOT NULL REFERENCES public.membership_invite_keys(id) ON DELETE CASCADE,
  redeemed_by_user_id uuid NOT NULL,
  business_staff_id uuid REFERENCES public.business_staff(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (invite_key_id, redeemed_by_user_id)
);

ALTER TABLE public.membership_invite_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.membership_invite_redemptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage all invite keys" ON public.membership_invite_keys
  FOR ALL TO authenticated USING (has_admin_access(auth.uid())) WITH CHECK (has_admin_access(auth.uid()));

CREATE POLICY "Owners view their business invite keys" ON public.membership_invite_keys
  FOR SELECT TO authenticated USING (is_business_owner_or_manager(auth.uid(), business_id));

CREATE POLICY "Owners create invite keys" ON public.membership_invite_keys
  FOR INSERT TO authenticated WITH CHECK (
    is_business_owner_or_manager(auth.uid(), business_id) AND created_by = auth.uid()
  );

CREATE POLICY "Owners update their business invite keys" ON public.membership_invite_keys
  FOR UPDATE TO authenticated USING (is_business_owner_or_manager(auth.uid(), business_id));

CREATE POLICY "Owners delete their business invite keys" ON public.membership_invite_keys
  FOR DELETE TO authenticated USING (is_business_owner_or_manager(auth.uid(), business_id));

CREATE POLICY "Admins view all redemptions" ON public.membership_invite_redemptions
  FOR SELECT TO authenticated USING (has_admin_access(auth.uid()));

CREATE POLICY "User views own redemptions" ON public.membership_invite_redemptions
  FOR SELECT TO authenticated USING (redeemed_by_user_id = auth.uid());

CREATE POLICY "Owners view redemptions of their keys" ON public.membership_invite_redemptions
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.membership_invite_keys k
      WHERE k.id = invite_key_id
        AND is_business_owner_or_manager(auth.uid(), k.business_id)
    )
  );

CREATE TRIGGER trg_invite_keys_updated_at
  BEFORE UPDATE ON public.membership_invite_keys
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- generate_invite_key
CREATE OR REPLACE FUNCTION public.generate_invite_key(
  _business_id uuid,
  _role business_staff_role DEFAULT 'viewer',
  _max_uses integer DEFAULT 1,
  _valid_days integer DEFAULT NULL,
  _notes text DEFAULT NULL
) RETURNS TABLE(id uuid, code text, expires_at timestamptz)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_code text;
  v_expires timestamptz;
  v_sub_id uuid;
  v_sub_expires timestamptz;
  v_id uuid;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'unauthenticated'; END IF;
  IF NOT public.is_business_owner_or_manager(v_uid, _business_id) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  -- Tie expiry to active subscription (whichever sooner)
  SELECT s.id, s.expires_at INTO v_sub_id, v_sub_expires
  FROM public.membership_subscriptions s
  WHERE s.business_id = _business_id AND s.status IN ('active','past_due')
  ORDER BY s.created_at DESC LIMIT 1;

  v_expires := CASE
    WHEN _valid_days IS NOT NULL THEN now() + make_interval(days => _valid_days)
    ELSE NULL
  END;

  IF v_sub_expires IS NOT NULL THEN
    v_expires := LEAST(COALESCE(v_expires, v_sub_expires), v_sub_expires);
  END IF;

  v_code := 'INV-' || upper(encode(gen_random_bytes(9), 'base64'));
  v_code := replace(replace(replace(v_code, '/', ''), '+', ''), '=', '');

  INSERT INTO public.membership_invite_keys
    (business_id, subscription_id, code, role, max_uses, expires_at, notes, created_by)
  VALUES
    (_business_id, v_sub_id, v_code, _role, GREATEST(1, _max_uses), v_expires, _notes, v_uid)
  RETURNING membership_invite_keys.id INTO v_id;

  RETURN QUERY SELECT v_id, v_code, v_expires;
END $$;

GRANT EXECUTE ON FUNCTION public.generate_invite_key(uuid, business_staff_role, integer, integer, text) TO authenticated;

-- accept_invite_key
CREATE OR REPLACE FUNCTION public.accept_invite_key(_code text)
RETURNS TABLE(business_id uuid, role business_staff_role)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  k record;
  v_staff_id uuid;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'unauthenticated'; END IF;

  SELECT * INTO k FROM public.membership_invite_keys
   WHERE code = _code FOR UPDATE;

  IF k.id IS NULL THEN RAISE EXCEPTION 'invite_not_found'; END IF;
  IF k.status <> 'active' THEN RAISE EXCEPTION 'invite_not_active'; END IF;
  IF k.expires_at IS NOT NULL AND k.expires_at < now() THEN
    UPDATE public.membership_invite_keys SET status='expired' WHERE id = k.id;
    RAISE EXCEPTION 'invite_expired';
  END IF;
  IF k.used_count >= k.max_uses THEN
    UPDATE public.membership_invite_keys SET status='exhausted' WHERE id = k.id;
    RAISE EXCEPTION 'invite_exhausted';
  END IF;

  -- Add to business_staff (idempotent on (business_id,user_id))
  INSERT INTO public.business_staff (business_id, user_id, role, invited_by, is_active)
  VALUES (k.business_id, v_uid, k.role, k.created_by, true)
  ON CONFLICT (business_id, user_id) DO UPDATE SET is_active = true, role = EXCLUDED.role
  RETURNING id INTO v_staff_id;

  INSERT INTO public.membership_invite_redemptions (invite_key_id, redeemed_by_user_id, business_staff_id)
  VALUES (k.id, v_uid, v_staff_id)
  ON CONFLICT (invite_key_id, redeemed_by_user_id) DO NOTHING;

  UPDATE public.membership_invite_keys
     SET used_count = used_count + 1,
         status = CASE WHEN used_count + 1 >= max_uses THEN 'exhausted' ELSE status END
   WHERE id = k.id;

  RETURN QUERY SELECT k.business_id, k.role;
END $$;

GRANT EXECUTE ON FUNCTION public.accept_invite_key(text) TO authenticated;

-- revoke_invite_key
CREATE OR REPLACE FUNCTION public.revoke_invite_key(_key_id uuid, _reason text DEFAULT NULL)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  k record;
BEGIN
  SELECT * INTO k FROM public.membership_invite_keys WHERE id = _key_id;
  IF k.id IS NULL THEN RETURN false; END IF;
  IF NOT (public.has_admin_access(v_uid) OR public.is_business_owner_or_manager(v_uid, k.business_id)) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  UPDATE public.membership_invite_keys
     SET status='revoked', revoked_at = now(), revoke_reason = _reason
   WHERE id = _key_id;
  RETURN true;
END $$;

GRANT EXECUTE ON FUNCTION public.revoke_invite_key(uuid, text) TO authenticated;

-- ============================================================================
-- 5. ACCESS KEYS (API tokens scoped to tier)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.membership_access_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE,
  subscription_id uuid REFERENCES public.membership_subscriptions(id) ON DELETE SET NULL,
  name text NOT NULL,
  key_hash text NOT NULL UNIQUE,
  key_prefix text NOT NULL,
  scopes jsonb NOT NULL DEFAULT '[]'::jsonb,
  tier_at_creation membership_tier NOT NULL DEFAULT 'free',
  expires_at timestamptz,
  last_used_at timestamptz,
  revoked_at timestamptz,
  revoke_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_access_keys_user ON public.membership_access_keys (user_id);
CREATE INDEX IF NOT EXISTS idx_access_keys_business ON public.membership_access_keys (business_id);
CREATE INDEX IF NOT EXISTS idx_access_keys_active ON public.membership_access_keys (revoked_at, expires_at);

ALTER TABLE public.membership_access_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage all access keys" ON public.membership_access_keys
  FOR ALL TO authenticated USING (has_admin_access(auth.uid())) WITH CHECK (has_admin_access(auth.uid()));

CREATE POLICY "Users view own access keys" ON public.membership_access_keys
  FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "Owners view business access keys" ON public.membership_access_keys
  FOR SELECT TO authenticated USING (
    business_id IS NOT NULL AND is_business_owner_or_manager(auth.uid(), business_id)
  );

CREATE TRIGGER trg_access_keys_updated_at
  BEFORE UPDATE ON public.membership_access_keys
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- create_access_key — returns raw key ONCE
CREATE OR REPLACE FUNCTION public.create_access_key(
  _name text,
  _scopes jsonb DEFAULT '[]'::jsonb,
  _business_id uuid DEFAULT NULL
) RETURNS TABLE(id uuid, raw_key text, key_prefix text, expires_at timestamptz)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_raw text;
  v_hash text;
  v_prefix text;
  v_id uuid;
  v_tier membership_tier;
  v_sub_id uuid;
  v_sub_expires timestamptz;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'unauthenticated'; END IF;
  IF _business_id IS NOT NULL AND NOT public.is_business_owner_or_manager(v_uid, _business_id) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  -- Resolve tier and sub
  SELECT s.id, s.expires_at, p.tier INTO v_sub_id, v_sub_expires, v_tier
  FROM public.membership_subscriptions s
  JOIN public.membership_plans p ON p.id = s.plan_id
  WHERE (s.business_id = _business_id OR (_business_id IS NULL AND s.user_id = v_uid))
    AND s.status IN ('active','past_due')
  ORDER BY s.created_at DESC LIMIT 1;

  v_tier := COALESCE(v_tier, 'free'::membership_tier);

  v_raw := 'qk_' || encode(gen_random_bytes(24), 'hex');
  v_prefix := substring(v_raw from 1 for 11);
  v_hash := encode(digest(v_raw, 'sha256'), 'hex');

  INSERT INTO public.membership_access_keys
    (user_id, business_id, subscription_id, name, key_hash, key_prefix, scopes, tier_at_creation, expires_at)
  VALUES
    (v_uid, _business_id, v_sub_id, _name, v_hash, v_prefix, COALESCE(_scopes, '[]'::jsonb), v_tier, v_sub_expires)
  RETURNING membership_access_keys.id INTO v_id;

  RETURN QUERY SELECT v_id, v_raw, v_prefix, v_sub_expires;
END $$;

GRANT EXECUTE ON FUNCTION public.create_access_key(text, jsonb, uuid) TO authenticated;

-- revoke_access_key
CREATE OR REPLACE FUNCTION public.revoke_access_key(_key_id uuid, _reason text DEFAULT NULL)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  k record;
BEGIN
  SELECT * INTO k FROM public.membership_access_keys WHERE id = _key_id;
  IF k.id IS NULL THEN RETURN false; END IF;
  IF NOT (public.has_admin_access(v_uid) OR k.user_id = v_uid OR
          (k.business_id IS NOT NULL AND public.is_business_owner_or_manager(v_uid, k.business_id))) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  UPDATE public.membership_access_keys
     SET revoked_at = now(), revoke_reason = _reason
   WHERE id = _key_id AND revoked_at IS NULL;
  RETURN true;
END $$;

GRANT EXECUTE ON FUNCTION public.revoke_access_key(uuid, text) TO authenticated;

-- ============================================================================
-- 6. PROMO CODES
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.membership_promo_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  type text NOT NULL CHECK (type IN ('free_upgrade','discount')),
  target_tier membership_tier,
  duration_days integer,
  discount_percent integer CHECK (discount_percent BETWEEN 0 AND 100),
  max_redemptions integer NOT NULL DEFAULT 1,
  used_count integer NOT NULL DEFAULT 0,
  valid_from timestamptz NOT NULL DEFAULT now(),
  valid_until timestamptz,
  is_active boolean NOT NULL DEFAULT true,
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_promo_codes_code ON public.membership_promo_codes (code);
CREATE INDEX IF NOT EXISTS idx_promo_codes_active ON public.membership_promo_codes (is_active, valid_from, valid_until);

CREATE TABLE IF NOT EXISTS public.membership_promo_redemptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  promo_code_id uuid NOT NULL REFERENCES public.membership_promo_codes(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  business_id uuid REFERENCES public.businesses(id) ON DELETE SET NULL,
  applied_subscription_id uuid REFERENCES public.membership_subscriptions(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (promo_code_id, user_id)
);

ALTER TABLE public.membership_promo_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.membership_promo_redemptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage promo codes" ON public.membership_promo_codes
  FOR ALL TO authenticated USING (has_admin_access(auth.uid())) WITH CHECK (has_admin_access(auth.uid()));

-- Active codes are NOT publicly listable; only validated via redeem function
CREATE POLICY "Admins view all promo redemptions" ON public.membership_promo_redemptions
  FOR SELECT TO authenticated USING (has_admin_access(auth.uid()));

CREATE POLICY "Users view own promo redemptions" ON public.membership_promo_redemptions
  FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE TRIGGER trg_promo_codes_updated_at
  BEFORE UPDATE ON public.membership_promo_codes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- redeem_promo_code
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

    -- Cancel previous active subscription
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

    -- Update tier
    IF _business_id IS NOT NULL THEN
      UPDATE public.businesses SET membership_tier = c.target_tier WHERE id = _business_id;
    END IF;
    UPDATE public.profiles SET membership_tier = c.target_tier WHERE user_id = v_uid;
  END IF;

  INSERT INTO public.membership_promo_redemptions (promo_code_id, user_id, business_id, applied_subscription_id)
  VALUES (c.id, v_uid, _business_id, v_sub_id);

  UPDATE public.membership_promo_codes SET used_count = used_count + 1 WHERE id = c.id;

  INSERT INTO public.notifications (user_id, type, title, message, data, action_url)
  VALUES (v_uid, 'membership_promo_redeemed', 'تم تفعيل الكود الترويجي',
          'تم تفعيل اشتراكك بنجاح عبر الكود الترويجي.',
          jsonb_build_object('code', c.code, 'tier', c.target_tier), '/membership');

  RETURN QUERY SELECT true, 'redeemed'::text, v_sub_id;
END $$;

GRANT EXECUTE ON FUNCTION public.redeem_promo_code(text, uuid) TO authenticated;

-- ============================================================================
-- 7. CASCADE REVOCATION when subscription ends
-- ============================================================================
CREATE OR REPLACE FUNCTION public.cascade_revoke_keys_on_sub_change()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NEW.status IN ('cancelled','expired','replaced') AND OLD.status NOT IN ('cancelled','expired','replaced') THEN
    -- Revoke access keys tied to this subscription
    UPDATE public.membership_access_keys
       SET revoked_at = COALESCE(revoked_at, now()),
           revoke_reason = COALESCE(revoke_reason, 'subscription_' || NEW.status)
     WHERE subscription_id = NEW.id AND revoked_at IS NULL;

    -- Mark invite keys as revoked
    UPDATE public.membership_invite_keys
       SET status = 'revoked',
           revoked_at = COALESCE(revoked_at, now()),
           revoke_reason = COALESCE(revoke_reason, 'subscription_' || NEW.status)
     WHERE subscription_id = NEW.id AND status = 'active';
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_cascade_revoke_keys ON public.membership_subscriptions;
CREATE TRIGGER trg_cascade_revoke_keys
  AFTER UPDATE OF status ON public.membership_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.cascade_revoke_keys_on_sub_change();

-- ============================================================================
-- 8. CRON: process renewal failures daily at 02:30 UTC
-- ============================================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.unschedule('process-renewal-failures')
      WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'process-renewal-failures');
    PERFORM cron.schedule(
      'process-renewal-failures',
      '30 2 * * *',
      $cron$ SELECT public.process_renewal_failures(); $cron$
    );
  END IF;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;
