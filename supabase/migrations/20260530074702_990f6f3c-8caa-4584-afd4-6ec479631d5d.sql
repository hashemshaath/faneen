-- Reward catalog
CREATE TABLE public.loyalty_rewards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title_ar TEXT NOT NULL,
  title_en TEXT NOT NULL,
  description_ar TEXT,
  description_en TEXT,
  points_cost INTEGER NOT NULL CHECK (points_cost > 0),
  reward_type TEXT NOT NULL DEFAULT 'discount', -- discount | credit | gift | feature
  value_amount NUMERIC,
  currency_code TEXT DEFAULT 'SAR',
  stock INTEGER, -- NULL = unlimited
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.loyalty_rewards TO authenticated;
GRANT ALL ON public.loyalty_rewards TO service_role;

ALTER TABLE public.loyalty_rewards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone signed in can view active rewards"
  ON public.loyalty_rewards FOR SELECT TO authenticated
  USING (is_active = true OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins manage rewards"
  ON public.loyalty_rewards FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Redemptions
CREATE TABLE public.loyalty_redemptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  reward_id UUID NOT NULL REFERENCES public.loyalty_rewards(id) ON DELETE RESTRICT,
  points_spent INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- pending | fulfilled | cancelled
  redemption_code TEXT,
  fulfilled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.loyalty_redemptions TO authenticated;
GRANT ALL ON public.loyalty_redemptions TO service_role;

ALTER TABLE public.loyalty_redemptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own redemptions"
  ON public.loyalty_redemptions FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users create own redemptions"
  ON public.loyalty_redemptions FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins update redemptions"
  ON public.loyalty_redemptions FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_loyalty_redemptions_user ON public.loyalty_redemptions(user_id);
CREATE INDEX idx_loyalty_rewards_active ON public.loyalty_rewards(is_active, sort_order);

-- Atomic redemption function
CREATE OR REPLACE FUNCTION public.redeem_loyalty_reward(_reward_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_reward RECORD;
  v_balance INTEGER;
  v_redemption_id UUID;
  v_code TEXT;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'auth_required';
  END IF;

  SELECT * INTO v_reward FROM public.loyalty_rewards WHERE id = _reward_id FOR UPDATE;
  IF NOT FOUND OR NOT v_reward.is_active THEN
    RAISE EXCEPTION 'reward_unavailable';
  END IF;

  IF v_reward.stock IS NOT NULL AND v_reward.stock <= 0 THEN
    RAISE EXCEPTION 'out_of_stock';
  END IF;

  SELECT COALESCE(SUM(points), 0) INTO v_balance
    FROM public.loyalty_points WHERE user_id = v_uid;

  IF v_balance < v_reward.points_cost THEN
    RAISE EXCEPTION 'insufficient_points';
  END IF;

  v_code := 'RWD-' || upper(substr(gen_random_uuid()::text, 1, 8));

  INSERT INTO public.loyalty_redemptions(user_id, reward_id, points_spent, redemption_code)
    VALUES (v_uid, _reward_id, v_reward.points_cost, v_code)
    RETURNING id INTO v_redemption_id;

  INSERT INTO public.loyalty_points(user_id, points, reason, reference_id)
    VALUES (v_uid, -v_reward.points_cost, 'reward_redeemed', v_redemption_id::text);

  IF v_reward.stock IS NOT NULL THEN
    UPDATE public.loyalty_rewards SET stock = stock - 1, updated_at = now()
      WHERE id = _reward_id;
  END IF;

  RETURN v_redemption_id;
END;
$$;

REVOKE ALL ON FUNCTION public.redeem_loyalty_reward(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.redeem_loyalty_reward(UUID) TO authenticated;

-- Updated_at trigger
CREATE TRIGGER trg_loyalty_rewards_updated
  BEFORE UPDATE ON public.loyalty_rewards
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed a few rewards
INSERT INTO public.loyalty_rewards (title_ar, title_en, description_ar, description_en, points_cost, reward_type, value_amount, sort_order) VALUES
  ('خصم 50 ريال', '50 SAR Discount', 'خصم على أي عقد جديد', 'Discount on any new contract', 500, 'discount', 50, 1),
  ('خصم 200 ريال', '200 SAR Discount', 'خصم على عقد بقيمة 2000+ ريال', 'Discount on contracts over 2000 SAR', 1800, 'discount', 200, 2),
  ('ترقية مميزة لشهر', '1-Month Featured Listing', 'إبراز منشأتك في نتائج البحث', 'Highlight your business in search', 2500, 'feature', NULL, 3),
  ('شارة موثّق ذهبية', 'Gold Verified Badge', 'شارة ذهبية لمدة 90 يوم', 'Gold badge for 90 days', 5000, 'feature', NULL, 4);
