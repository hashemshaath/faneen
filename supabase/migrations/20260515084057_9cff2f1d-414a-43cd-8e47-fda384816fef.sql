-- =========================================================
-- Provider commercial foundation: plans, subscriptions, credits
-- =========================================================

-- 1) provider_plans ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.provider_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name_ar text NOT NULL,
  name_en text,
  description_ar text,
  monthly_price numeric NOT NULL DEFAULT 0,
  lead_credits_per_month integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  features jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.provider_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view active plans"
  ON public.provider_plans FOR SELECT TO authenticated
  USING (is_active = true OR public.has_admin_access(auth.uid()));

CREATE POLICY "Admins manage plans"
  ON public.provider_plans FOR ALL TO authenticated
  USING (public.has_admin_access(auth.uid()))
  WITH CHECK (public.has_admin_access(auth.uid()));

-- 2) provider_subscriptions -------------------------------------------------
CREATE TABLE IF NOT EXISTS public.provider_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  provider_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  plan_id uuid NOT NULL REFERENCES public.provider_plans(id),
  status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('active','paused','expired','cancelled')),
  current_period_start timestamptz NOT NULL DEFAULT now(),
  current_period_end timestamptz,
  lead_credits_balance integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (business_id)
);

CREATE INDEX IF NOT EXISTS idx_provider_subscriptions_business
  ON public.provider_subscriptions(business_id);
CREATE INDEX IF NOT EXISTS idx_provider_subscriptions_user
  ON public.provider_subscriptions(provider_user_id);

ALTER TABLE public.provider_subscriptions ENABLE ROW LEVEL SECURITY;

-- Business owner can read their subscription
CREATE POLICY "Owner can view own subscription"
  ON public.provider_subscriptions FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.businesses b
      WHERE b.id = provider_subscriptions.business_id AND b.user_id = auth.uid()
    )
    OR public.has_admin_access(auth.uid())
  );

CREATE POLICY "Admins manage subscriptions"
  ON public.provider_subscriptions FOR ALL TO authenticated
  USING (public.has_admin_access(auth.uid()))
  WITH CHECK (public.has_admin_access(auth.uid()));

-- Guard: business owners cannot directly modify balance / status / plan / period.
-- (They have no INSERT/UPDATE/DELETE policy; only admin policy + service-role bypass.)
-- Defense-in-depth trigger that blocks owners from changing protected fields
-- in case a future policy grants them UPDATE.
CREATE OR REPLACE FUNCTION public.provider_subscriptions_owner_guard()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.has_admin_access(auth.uid()) THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'UPDATE' THEN
    IF NEW.lead_credits_balance IS DISTINCT FROM OLD.lead_credits_balance
       OR NEW.status IS DISTINCT FROM OLD.status
       OR NEW.plan_id IS DISTINCT FROM OLD.plan_id
       OR NEW.current_period_start IS DISTINCT FROM OLD.current_period_start
       OR NEW.current_period_end IS DISTINCT FROM OLD.current_period_end THEN
      RAISE EXCEPTION 'Providers cannot modify subscription billing fields';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_provider_subscriptions_owner_guard
  BEFORE UPDATE ON public.provider_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.provider_subscriptions_owner_guard();

-- 3) provider_lead_credit_transactions --------------------------------------
CREATE TABLE IF NOT EXISTS public.provider_lead_credit_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  provider_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  quote_request_lead_id uuid REFERENCES public.quote_request_leads(id) ON DELETE SET NULL,
  type text NOT NULL CHECK (type IN ('grant','consume','refund','adjustment')),
  amount integer NOT NULL,
  balance_after integer NOT NULL,
  reason text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_credit_tx_business_created
  ON public.provider_lead_credit_transactions(business_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_credit_tx_lead
  ON public.provider_lead_credit_transactions(quote_request_lead_id);

ALTER TABLE public.provider_lead_credit_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner can view own credit tx"
  ON public.provider_lead_credit_transactions FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.businesses b
      WHERE b.id = provider_lead_credit_transactions.business_id AND b.user_id = auth.uid()
    )
    OR public.has_admin_access(auth.uid())
  );

CREATE POLICY "Admins manage credit tx"
  ON public.provider_lead_credit_transactions FOR ALL TO authenticated
  USING (public.has_admin_access(auth.uid()))
  WITH CHECK (public.has_admin_access(auth.uid()));

-- updated_at triggers
CREATE TRIGGER trg_provider_plans_updated
  BEFORE UPDATE ON public.provider_plans
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_provider_subscriptions_updated
  BEFORE UPDATE ON public.provider_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4) Seed default plans -----------------------------------------------------
INSERT INTO public.provider_plans (code, name_ar, name_en, description_ar, monthly_price, lead_credits_per_month, features)
VALUES
  ('free_launch', 'خطة الإطلاق', 'Launch', 'مناسبة لمرحلة الإطلاق، مع إتاحة يدوية من فريق قطاعات.', 0, 0, '[]'::jsonb),
  ('growth',      'نمو',         'Growth', 'خطة مستقبلية للمزودين النشطين.',                          0, 20, '[]'::jsonb),
  ('pro',         'احترافية',    'Pro',    'خطة مستقبلية للورش والمصانع التي تستقبل فرصًا بشكل متكرر.', 0, 60, '[]'::jsonb)
ON CONFLICT (code) DO NOTHING;

-- 5) Backfill subscriptions for existing businesses -------------------------
INSERT INTO public.provider_subscriptions (business_id, provider_user_id, plan_id, status, lead_credits_balance)
SELECT b.id, b.user_id, p.id, 'active', 0
FROM public.businesses b
CROSS JOIN public.provider_plans p
WHERE p.code = 'free_launch'
  AND NOT EXISTS (
    SELECT 1 FROM public.provider_subscriptions s WHERE s.business_id = b.id
  );

-- 6) Auto-create a free_launch subscription for new businesses --------------
CREATE OR REPLACE FUNCTION public.ensure_provider_subscription()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  free_id uuid;
BEGIN
  SELECT id INTO free_id FROM public.provider_plans WHERE code = 'free_launch' LIMIT 1;
  IF free_id IS NULL THEN
    RETURN NEW;
  END IF;
  INSERT INTO public.provider_subscriptions (business_id, provider_user_id, plan_id, status, lead_credits_balance)
  VALUES (NEW.id, NEW.user_id, free_id, 'active', 0)
  ON CONFLICT (business_id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_business_default_subscription
  AFTER INSERT ON public.businesses
  FOR EACH ROW EXECUTE FUNCTION public.ensure_provider_subscription();