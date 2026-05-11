
CREATE TABLE IF NOT EXISTS public.membership_upgrade_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  current_tier text,
  requested_tier text NOT NULL,
  requested_plan_id uuid REFERENCES public.membership_plans(id),
  billing_cycle text NOT NULL DEFAULT 'monthly' CHECK (billing_cycle IN ('monthly','yearly')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','cancelled')),
  note text,
  admin_note text,
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mur_user ON public.membership_upgrade_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_mur_business ON public.membership_upgrade_requests(business_id);
CREATE INDEX IF NOT EXISTS idx_mur_status ON public.membership_upgrade_requests(status);

ALTER TABLE public.membership_upgrade_requests ENABLE ROW LEVEL SECURITY;

-- Providers: view own
CREATE POLICY "Users view own upgrade requests"
ON public.membership_upgrade_requests
FOR SELECT TO authenticated
USING (auth.uid() = user_id);

-- Providers: insert own (must own/manage the business)
CREATE POLICY "Users create own upgrade requests"
ON public.membership_upgrade_requests
FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND public.is_business_owner_or_manager(auth.uid(), business_id)
);

-- Providers: cancel their own pending requests only
CREATE POLICY "Users cancel own pending requests"
ON public.membership_upgrade_requests
FOR UPDATE TO authenticated
USING (auth.uid() = user_id AND status = 'pending')
WITH CHECK (auth.uid() = user_id AND status IN ('pending','cancelled'));

-- Admins: full access
CREATE POLICY "Admins manage all upgrade requests"
ON public.membership_upgrade_requests
FOR ALL TO authenticated
USING (public.has_admin_access(auth.uid()))
WITH CHECK (public.has_admin_access(auth.uid()));

CREATE TRIGGER update_mur_updated_at
BEFORE UPDATE ON public.membership_upgrade_requests
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
