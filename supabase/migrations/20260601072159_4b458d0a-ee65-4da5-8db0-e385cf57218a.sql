
-- SERVICE-ACTIVATION-GOVERNANCE-1 Phase A
-- Extend business_services with governance status fields.

ALTER TABLE public.business_services
  ADD COLUMN IF NOT EXISTS provider_status text NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS admin_status text NOT NULL DEFAULT 'allowed',
  ADD COLUMN IF NOT EXISTS required_plan_tier public.membership_tier NULL,
  ADD COLUMN IF NOT EXISTS requires_admin_review boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_premium_service boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_featured boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS admin_note text NULL,
  ADD COLUMN IF NOT EXISTS provider_note text NULL,
  ADD COLUMN IF NOT EXISTS rejection_reason text NULL,
  ADD COLUMN IF NOT EXISTS reviewed_by uuid NULL,
  ADD COLUMN IF NOT EXISTS reviewed_at timestamptz NULL,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- Allowed value constraints
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'business_services_provider_status_chk') THEN
    ALTER TABLE public.business_services
      ADD CONSTRAINT business_services_provider_status_chk
      CHECK (provider_status IN ('active','paused'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'business_services_admin_status_chk') THEN
    ALTER TABLE public.business_services
      ADD CONSTRAINT business_services_admin_status_chk
      CHECK (admin_status IN ('allowed','suspended','rejected','pending_review'));
  END IF;
END$$;

-- Backfill provider_status from legacy is_active
UPDATE public.business_services
  SET provider_status = CASE WHEN is_active THEN 'active' ELSE 'paused' END
  WHERE provider_status = 'active' AND is_active = false;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_business_services_provider_status
  ON public.business_services (business_id, provider_status);
CREATE INDEX IF NOT EXISTS idx_business_services_admin_status
  ON public.business_services (admin_status);
CREATE INDEX IF NOT EXISTS idx_business_services_required_plan_tier
  ON public.business_services (required_plan_tier)
  WHERE required_plan_tier IS NOT NULL;

-- updated_at trigger (reuse existing helper if present)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'business_services_set_updated_at'
  ) THEN
    CREATE TRIGGER business_services_set_updated_at
      BEFORE UPDATE ON public.business_services
      FOR EACH ROW
      EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END$$;

-- Admin-only update policy: lets admins update governance fields on any row.
-- (The existing owner UPDATE policy keeps working for providers; per-column
-- separation of admin-only fields is enforced at the service-layer / RPC level
-- in Phase B, since Postgres RLS does not split UPDATE per column cleanly.)
DROP POLICY IF EXISTS "Admins can update service governance fields" ON public.business_services;
CREATE POLICY "Admins can update service governance fields"
  ON public.business_services
  FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Admin SELECT — admins need to read all rows for the governance page.
DROP POLICY IF EXISTS "Admins can view all services" ON public.business_services;
CREATE POLICY "Admins can view all services"
  ON public.business_services
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
