
-- ================================================================
-- BRANCHES PRO: extend business_branches + linking tables
-- ================================================================

-- 1) Extend business_branches with new columns
ALTER TABLE public.business_branches
  ADD COLUMN IF NOT EXISTS slug text,
  ADD COLUMN IF NOT EXISTS whatsapp text,
  ADD COLUMN IF NOT EXISTS working_hours jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS description_ar text,
  ADD COLUMN IF NOT EXISTS description_en text,
  ADD COLUMN IF NOT EXISTS social_instagram text,
  ADD COLUMN IF NOT EXISTS social_x text,
  ADD COLUMN IF NOT EXISTS social_tiktok text,
  ADD COLUMN IF NOT EXISTS social_linkedin text,
  ADD COLUMN IF NOT EXISTS social_facebook text,
  ADD COLUMN IF NOT EXISTS social_snapchat text,
  ADD COLUMN IF NOT EXISTS social_youtube text,
  ADD COLUMN IF NOT EXISTS sales_manager_staff_id uuid REFERENCES public.business_staff(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS address_id uuid REFERENCES public.addresses(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS short_address text,
  ADD COLUMN IF NOT EXISTS floor_number text,
  ADD COLUMN IF NOT EXISTS unit_number text;

-- 2) Backfill slug from ref_id (lowercased) for existing rows
UPDATE public.business_branches
SET slug = LOWER(REPLACE(COALESCE(ref_id, id::text), '-', ''))
WHERE slug IS NULL;

-- 3) Unique constraints / indexes
CREATE UNIQUE INDEX IF NOT EXISTS ux_business_branches_business_slug
  ON public.business_branches(business_id, slug)
  WHERE slug IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS ux_business_branches_one_main
  ON public.business_branches(business_id)
  WHERE is_main = true;

CREATE INDEX IF NOT EXISTS ix_business_branches_sales_manager
  ON public.business_branches(sales_manager_staff_id)
  WHERE sales_manager_staff_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS ix_business_branches_address
  ON public.business_branches(address_id)
  WHERE address_id IS NOT NULL;

-- 4) Trigger: validate sales_manager belongs to same business and is active
CREATE OR REPLACE FUNCTION public.validate_branch_sales_manager()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.sales_manager_staff_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.business_staff
      WHERE id = NEW.sales_manager_staff_id
        AND business_id = NEW.business_id
        AND is_active = true
    ) THEN
      RAISE EXCEPTION 'sales_manager_staff_id must reference an active staff member of the same business';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_branch_sales_manager ON public.business_branches;
CREATE TRIGGER trg_validate_branch_sales_manager
  BEFORE INSERT OR UPDATE OF sales_manager_staff_id, business_id ON public.business_branches
  FOR EACH ROW EXECUTE FUNCTION public.validate_branch_sales_manager();

-- 5) Trigger: ensure first branch becomes main automatically
CREATE OR REPLACE FUNCTION public.ensure_main_branch_on_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.is_main IS NOT TRUE THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.business_branches
      WHERE business_id = NEW.business_id AND is_main = true
    ) THEN
      NEW.is_main := true;
    END IF;
  END IF;

  -- Auto-generate slug if missing
  IF NEW.slug IS NULL OR LENGTH(TRIM(NEW.slug)) = 0 THEN
    NEW.slug := LOWER(REPLACE(COALESCE(NEW.ref_id, NEW.id::text), '-', ''));
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_ensure_main_branch_on_insert ON public.business_branches;
CREATE TRIGGER trg_ensure_main_branch_on_insert
  BEFORE INSERT ON public.business_branches
  FOR EACH ROW EXECUTE FUNCTION public.ensure_main_branch_on_insert();

-- 6) RPC: set_main_branch (atomic switch)
CREATE OR REPLACE FUNCTION public.set_main_branch(p_branch_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_business_id uuid;
BEGIN
  SELECT business_id INTO v_business_id
  FROM public.business_branches WHERE id = p_branch_id;

  IF v_business_id IS NULL THEN
    RAISE EXCEPTION 'Branch not found';
  END IF;

  -- Permission check: owner OR manager OR admin
  IF NOT (
    EXISTS (SELECT 1 FROM public.businesses WHERE id = v_business_id AND user_id = auth.uid())
    OR public.is_business_owner_or_manager(auth.uid(), v_business_id)
    OR public.has_admin_access(auth.uid())
  ) THEN
    RAISE EXCEPTION 'Not authorized to set main branch';
  END IF;

  -- Atomic swap: clear all main flags then set the target
  UPDATE public.business_branches
    SET is_main = false, updated_at = now()
    WHERE business_id = v_business_id AND is_main = true AND id <> p_branch_id;

  UPDATE public.business_branches
    SET is_main = true, updated_at = now()
    WHERE id = p_branch_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.set_main_branch(uuid) TO authenticated;

-- 7) Prevent deletion of main branch when other branches exist
CREATE OR REPLACE FUNCTION public.prevent_main_branch_delete()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.is_main = true THEN
    IF EXISTS (
      SELECT 1 FROM public.business_branches
      WHERE business_id = OLD.business_id AND id <> OLD.id
    ) THEN
      RAISE EXCEPTION 'Cannot delete main branch while other branches exist. Set another branch as main first.';
    END IF;
  END IF;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_main_branch_delete ON public.business_branches;
CREATE TRIGGER trg_prevent_main_branch_delete
  BEFORE DELETE ON public.business_branches
  FOR EACH ROW EXECUTE FUNCTION public.prevent_main_branch_delete();

-- ================================================================
-- 8) branch_services: link business_services (products) to branches
-- ================================================================
CREATE TABLE IF NOT EXISTS public.branch_services (
  branch_id   uuid NOT NULL REFERENCES public.business_branches(id) ON DELETE CASCADE,
  service_id  uuid NOT NULL REFERENCES public.business_services(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  created_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (branch_id, service_id)
);

CREATE INDEX IF NOT EXISTS ix_branch_services_business ON public.branch_services(business_id);
CREATE INDEX IF NOT EXISTS ix_branch_services_service  ON public.branch_services(service_id);

GRANT SELECT ON public.branch_services TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.branch_services TO authenticated;
GRANT ALL ON public.branch_services TO service_role;

ALTER TABLE public.branch_services ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view active branch services"
  ON public.branch_services FOR SELECT
  TO anon, authenticated
  USING (
    EXISTS (SELECT 1 FROM public.business_branches b
            WHERE b.id = branch_services.branch_id AND b.is_active = true)
  );

CREATE POLICY "Owners and managers can manage branch services"
  ON public.branch_services FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.businesses
            WHERE id = branch_services.business_id AND user_id = auth.uid())
    OR public.is_business_owner_or_manager(auth.uid(), branch_services.business_id)
    OR public.has_admin_access(auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.businesses
            WHERE id = branch_services.business_id AND user_id = auth.uid())
    OR public.is_business_owner_or_manager(auth.uid(), branch_services.business_id)
    OR public.has_admin_access(auth.uid())
  );

-- ================================================================
-- 9) branch_promotions: link promotions (offers) to branches
-- ================================================================
CREATE TABLE IF NOT EXISTS public.branch_promotions (
  branch_id    uuid NOT NULL REFERENCES public.business_branches(id) ON DELETE CASCADE,
  promotion_id uuid NOT NULL REFERENCES public.promotions(id) ON DELETE CASCADE,
  business_id  uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  created_at   timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (branch_id, promotion_id)
);

CREATE INDEX IF NOT EXISTS ix_branch_promotions_business  ON public.branch_promotions(business_id);
CREATE INDEX IF NOT EXISTS ix_branch_promotions_promotion ON public.branch_promotions(promotion_id);

GRANT SELECT ON public.branch_promotions TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.branch_promotions TO authenticated;
GRANT ALL ON public.branch_promotions TO service_role;

ALTER TABLE public.branch_promotions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view active branch promotions"
  ON public.branch_promotions FOR SELECT
  TO anon, authenticated
  USING (
    EXISTS (SELECT 1 FROM public.business_branches b
            WHERE b.id = branch_promotions.branch_id AND b.is_active = true)
  );

CREATE POLICY "Owners and managers can manage branch promotions"
  ON public.branch_promotions FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.businesses
            WHERE id = branch_promotions.business_id AND user_id = auth.uid())
    OR public.is_business_owner_or_manager(auth.uid(), branch_promotions.business_id)
    OR public.has_admin_access(auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.businesses
            WHERE id = branch_promotions.business_id AND user_id = auth.uid())
    OR public.is_business_owner_or_manager(auth.uid(), branch_promotions.business_id)
    OR public.has_admin_access(auth.uid())
  );

-- ================================================================
-- 10) Backfill: ensure every existing business has at least one main branch
-- ================================================================
UPDATE public.business_branches bb
SET is_main = true, updated_at = now()
WHERE bb.id = (
  SELECT id FROM public.business_branches
  WHERE business_id = bb.business_id
  ORDER BY sort_order ASC, created_at ASC
  LIMIT 1
)
AND NOT EXISTS (
  SELECT 1 FROM public.business_branches
  WHERE business_id = bb.business_id AND is_main = true
);
