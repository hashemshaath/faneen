-- =========================================================
-- Private Sectors microservice
-- =========================================================

-- Status enums
DO $$ BEGIN
  CREATE TYPE public.private_sector_status AS ENUM ('draft','pending','approved','rejected','suspended');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.private_sector_brand_type AS ENUM ('own_brand','exclusive_agency','authorized_dealer','distributor','manufacturer');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.private_sector_distributor_role AS ENUM ('authorized_dealer','distributor','reseller','agent','showroom');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.private_sector_link_status AS ENUM ('pending','approved','rejected','revoked');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Sequences for ref ids
CREATE SEQUENCE IF NOT EXISTS public.private_sectors_seq START 1000;
CREATE SEQUENCE IF NOT EXISTS public.private_sector_specs_seq START 1000;
CREATE SEQUENCE IF NOT EXISTS public.private_sector_distributors_seq START 1000;

-- =========================================================
-- private_sectors
-- =========================================================
CREATE TABLE IF NOT EXISTS public.private_sectors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ref_id TEXT UNIQUE NOT NULL DEFAULT ('PSC-' || lpad(nextval('public.private_sectors_seq')::text, 7, '0')),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  parent_sector TEXT NOT NULL,            -- e.g. 'aluminum','kitchens' (matches ONBOARDING_SECTORS ids)
  brand_type public.private_sector_brand_type NOT NULL DEFAULT 'own_brand',
  name_ar TEXT NOT NULL,
  name_en TEXT,
  slug TEXT UNIQUE NOT NULL,
  short_description_ar TEXT,
  short_description_en TEXT,
  description_ar TEXT,
  description_en TEXT,
  logo_url TEXT,
  cover_url TEXT,
  website TEXT,
  country_id UUID,
  contact_email TEXT,
  contact_phone TEXT,
  established_year INT,
  status public.private_sector_status NOT NULL DEFAULT 'draft',
  rejection_reason TEXT,
  submitted_at TIMESTAMPTZ,
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  is_featured BOOLEAN NOT NULL DEFAULT false,
  sort_order INT NOT NULL DEFAULT 0,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_private_sectors_business ON public.private_sectors(business_id);
CREATE INDEX IF NOT EXISTS idx_private_sectors_status ON public.private_sectors(status);
CREATE INDEX IF NOT EXISTS idx_private_sectors_parent ON public.private_sectors(parent_sector);

-- =========================================================
-- specializations
-- =========================================================
CREATE TABLE IF NOT EXISTS public.private_sector_specializations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ref_id TEXT UNIQUE NOT NULL DEFAULT ('PSP-' || lpad(nextval('public.private_sector_specs_seq')::text, 7, '0')),
  sector_id UUID NOT NULL REFERENCES public.private_sectors(id) ON DELETE CASCADE,
  name_ar TEXT NOT NULL,
  name_en TEXT,
  description_ar TEXT,
  description_en TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_psp_sector ON public.private_sector_specializations(sector_id);

-- =========================================================
-- distributors
-- =========================================================
CREATE TABLE IF NOT EXISTS public.private_sector_distributors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ref_id TEXT UNIQUE NOT NULL DEFAULT ('PSD-' || lpad(nextval('public.private_sector_distributors_seq')::text, 7, '0')),
  sector_id UUID NOT NULL REFERENCES public.private_sectors(id) ON DELETE CASCADE,
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  role public.private_sector_distributor_role NOT NULL DEFAULT 'authorized_dealer',
  territory_ar TEXT,
  territory_en TEXT,
  since_date DATE,
  notes TEXT,
  status public.private_sector_link_status NOT NULL DEFAULT 'pending',
  requested_by UUID,
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (sector_id, business_id)
);
CREATE INDEX IF NOT EXISTS idx_psd_sector ON public.private_sector_distributors(sector_id);
CREATE INDEX IF NOT EXISTS idx_psd_business ON public.private_sector_distributors(business_id);
CREATE INDEX IF NOT EXISTS idx_psd_status ON public.private_sector_distributors(status);

-- =========================================================
-- audit log
-- =========================================================
CREATE TABLE IF NOT EXISTS public.private_sector_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sector_id UUID REFERENCES public.private_sectors(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL,           -- 'sector' | 'specialization' | 'distributor'
  entity_id UUID,
  action TEXT NOT NULL,                -- 'created' | 'updated' | 'submitted' | 'approved' | 'rejected' | 'suspended' | 'deleted' | 'distributor_requested' | 'distributor_approved' | 'distributor_revoked'
  actor_user_id UUID,
  before_data JSONB,
  after_data JSONB,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_psal_sector ON public.private_sector_audit_log(sector_id);
CREATE INDEX IF NOT EXISTS idx_psal_created ON public.private_sector_audit_log(created_at DESC);

-- =========================================================
-- Helpers
-- =========================================================

-- Slug generator (latin-friendly)
CREATE OR REPLACE FUNCTION public.private_sector_make_slug(_name TEXT, _ref TEXT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
  base TEXT;
BEGIN
  base := lower(regexp_replace(coalesce(_name, ''), '[^a-zA-Z0-9\u0600-\u06FF]+', '-', 'g'));
  base := regexp_replace(base, '(^-+|-+$)', '', 'g');
  IF base IS NULL OR length(base) = 0 THEN
    base := 'sector';
  END IF;
  RETURN base || '-' || lower(replace(coalesce(_ref, gen_random_uuid()::text), 'psc-', ''));
END;
$$;

-- updated_at trigger (reuse existing util if available)
CREATE OR REPLACE FUNCTION public.private_sector_touch_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

-- Auto slug + audit on insert/update
CREATE OR REPLACE FUNCTION public.private_sectors_before_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.slug IS NULL OR length(NEW.slug) = 0 THEN
    NEW.slug := public.private_sector_make_slug(coalesce(NEW.name_en, NEW.name_ar), NEW.ref_id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_private_sectors_touch ON public.private_sectors;
CREATE TRIGGER trg_private_sectors_touch BEFORE UPDATE ON public.private_sectors
FOR EACH ROW EXECUTE FUNCTION public.private_sector_touch_updated_at();

DROP TRIGGER IF EXISTS trg_private_sectors_before_insert ON public.private_sectors;
CREATE TRIGGER trg_private_sectors_before_insert BEFORE INSERT ON public.private_sectors
FOR EACH ROW EXECUTE FUNCTION public.private_sectors_before_insert();

DROP TRIGGER IF EXISTS trg_psp_touch ON public.private_sector_specializations;
CREATE TRIGGER trg_psp_touch BEFORE UPDATE ON public.private_sector_specializations
FOR EACH ROW EXECUTE FUNCTION public.private_sector_touch_updated_at();

DROP TRIGGER IF EXISTS trg_psd_touch ON public.private_sector_distributors;
CREATE TRIGGER trg_psd_touch BEFORE UPDATE ON public.private_sector_distributors
FOR EACH ROW EXECUTE FUNCTION public.private_sector_touch_updated_at();

-- Audit logger trigger for private_sectors
CREATE OR REPLACE FUNCTION public.private_sectors_audit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _action TEXT;
BEGIN
  IF TG_OP = 'INSERT' THEN
    _action := 'created';
    INSERT INTO public.private_sector_audit_log (sector_id, entity_type, entity_id, action, actor_user_id, after_data)
    VALUES (NEW.id, 'sector', NEW.id, _action, auth.uid(), to_jsonb(NEW));
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.status IS DISTINCT FROM NEW.status THEN
      _action := NEW.status::text;
    ELSE
      _action := 'updated';
    END IF;
    INSERT INTO public.private_sector_audit_log (sector_id, entity_type, entity_id, action, actor_user_id, before_data, after_data)
    VALUES (NEW.id, 'sector', NEW.id, _action, auth.uid(), to_jsonb(OLD), to_jsonb(NEW));
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.private_sector_audit_log (sector_id, entity_type, entity_id, action, actor_user_id, before_data)
    VALUES (OLD.id, 'sector', OLD.id, 'deleted', auth.uid(), to_jsonb(OLD));
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_private_sectors_audit ON public.private_sectors;
CREATE TRIGGER trg_private_sectors_audit
AFTER INSERT OR UPDATE OR DELETE ON public.private_sectors
FOR EACH ROW EXECUTE FUNCTION public.private_sectors_audit();

-- Audit for distributors
CREATE OR REPLACE FUNCTION public.private_sector_distributors_audit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _action TEXT;
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.private_sector_audit_log (sector_id, entity_type, entity_id, action, actor_user_id, after_data)
    VALUES (NEW.sector_id, 'distributor', NEW.id, 'distributor_requested', auth.uid(), to_jsonb(NEW));
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
    _action := 'distributor_' || NEW.status::text;
    INSERT INTO public.private_sector_audit_log (sector_id, entity_type, entity_id, action, actor_user_id, before_data, after_data)
    VALUES (NEW.sector_id, 'distributor', NEW.id, _action, auth.uid(), to_jsonb(OLD), to_jsonb(NEW));
    RETURN NEW;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_psd_audit ON public.private_sector_distributors;
CREATE TRIGGER trg_psd_audit
AFTER INSERT OR UPDATE ON public.private_sector_distributors
FOR EACH ROW EXECUTE FUNCTION public.private_sector_distributors_audit();

-- =========================================================
-- Helper: does current user own/staff a business?
-- =========================================================
CREATE OR REPLACE FUNCTION public.user_can_manage_business(_business_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.businesses b
    WHERE b.id = _business_id AND b.user_id = auth.uid()
  ) OR EXISTS (
    SELECT 1 FROM public.business_staff s
    WHERE s.business_id = _business_id
      AND s.user_id = auth.uid()
      AND s.is_active = true
  );
$$;

-- =========================================================
-- RLS
-- =========================================================
ALTER TABLE public.private_sectors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.private_sector_specializations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.private_sector_distributors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.private_sector_audit_log ENABLE ROW LEVEL SECURITY;

-- private_sectors
DROP POLICY IF EXISTS "ps_public_read_approved" ON public.private_sectors;
CREATE POLICY "ps_public_read_approved" ON public.private_sectors
FOR SELECT USING (status = 'approved');

DROP POLICY IF EXISTS "ps_owner_read" ON public.private_sectors;
CREATE POLICY "ps_owner_read" ON public.private_sectors
FOR SELECT TO authenticated
USING (public.user_can_manage_business(business_id) OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "ps_owner_insert" ON public.private_sectors;
CREATE POLICY "ps_owner_insert" ON public.private_sectors
FOR INSERT TO authenticated
WITH CHECK (public.user_can_manage_business(business_id));

DROP POLICY IF EXISTS "ps_owner_update" ON public.private_sectors;
CREATE POLICY "ps_owner_update" ON public.private_sectors
FOR UPDATE TO authenticated
USING (public.user_can_manage_business(business_id) OR public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.user_can_manage_business(business_id) OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "ps_admin_delete" ON public.private_sectors;
CREATE POLICY "ps_admin_delete" ON public.private_sectors
FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.user_can_manage_business(business_id));

-- specializations
DROP POLICY IF EXISTS "psp_public_read" ON public.private_sector_specializations;
CREATE POLICY "psp_public_read" ON public.private_sector_specializations
FOR SELECT USING (
  is_active = true AND EXISTS (
    SELECT 1 FROM public.private_sectors p
    WHERE p.id = sector_id AND p.status = 'approved'
  )
);

DROP POLICY IF EXISTS "psp_manage" ON public.private_sector_specializations;
CREATE POLICY "psp_manage" ON public.private_sector_specializations
FOR ALL TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.private_sectors p
          WHERE p.id = sector_id AND public.user_can_manage_business(p.business_id))
  OR public.has_role(auth.uid(), 'admin')
)
WITH CHECK (
  EXISTS (SELECT 1 FROM public.private_sectors p
          WHERE p.id = sector_id AND public.user_can_manage_business(p.business_id))
  OR public.has_role(auth.uid(), 'admin')
);

-- distributors
DROP POLICY IF EXISTS "psd_public_read_approved" ON public.private_sector_distributors;
CREATE POLICY "psd_public_read_approved" ON public.private_sector_distributors
FOR SELECT USING (
  status = 'approved' AND EXISTS (
    SELECT 1 FROM public.private_sectors p
    WHERE p.id = sector_id AND p.status = 'approved'
  )
);

DROP POLICY IF EXISTS "psd_parties_read" ON public.private_sector_distributors;
CREATE POLICY "psd_parties_read" ON public.private_sector_distributors
FOR SELECT TO authenticated
USING (
  public.user_can_manage_business(business_id)
  OR EXISTS (SELECT 1 FROM public.private_sectors p
             WHERE p.id = sector_id AND public.user_can_manage_business(p.business_id))
  OR public.has_role(auth.uid(), 'admin')
);

DROP POLICY IF EXISTS "psd_request_insert" ON public.private_sector_distributors;
CREATE POLICY "psd_request_insert" ON public.private_sector_distributors
FOR INSERT TO authenticated
WITH CHECK (
  public.user_can_manage_business(business_id)
  OR EXISTS (SELECT 1 FROM public.private_sectors p
             WHERE p.id = sector_id AND public.user_can_manage_business(p.business_id))
  OR public.has_role(auth.uid(), 'admin')
);

DROP POLICY IF EXISTS "psd_owner_admin_update" ON public.private_sector_distributors;
CREATE POLICY "psd_owner_admin_update" ON public.private_sector_distributors
FOR UPDATE TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.private_sectors p
          WHERE p.id = sector_id AND public.user_can_manage_business(p.business_id))
  OR public.has_role(auth.uid(), 'admin')
)
WITH CHECK (
  EXISTS (SELECT 1 FROM public.private_sectors p
          WHERE p.id = sector_id AND public.user_can_manage_business(p.business_id))
  OR public.has_role(auth.uid(), 'admin')
);

DROP POLICY IF EXISTS "psd_delete" ON public.private_sector_distributors;
CREATE POLICY "psd_delete" ON public.private_sector_distributors
FOR DELETE TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.private_sectors p
          WHERE p.id = sector_id AND public.user_can_manage_business(p.business_id))
  OR public.has_role(auth.uid(), 'admin')
);

-- audit log
DROP POLICY IF EXISTS "psal_owner_admin_read" ON public.private_sector_audit_log;
CREATE POLICY "psal_owner_admin_read" ON public.private_sector_audit_log
FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  OR (sector_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.private_sectors p
    WHERE p.id = sector_id AND public.user_can_manage_business(p.business_id)
  ))
);

-- =========================================================
-- RPCs
-- =========================================================

-- Submit sector for review
CREATE OR REPLACE FUNCTION public.submit_private_sector(_id UUID)
RETURNS public.private_sectors
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _row public.private_sectors;
BEGIN
  SELECT * INTO _row FROM public.private_sectors WHERE id = _id;
  IF NOT FOUND THEN RAISE EXCEPTION 'NOT_FOUND'; END IF;
  IF NOT public.user_can_manage_business(_row.business_id) THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;
  IF _row.status NOT IN ('draft','rejected') THEN
    RAISE EXCEPTION 'INVALID_STATE';
  END IF;
  IF _row.name_ar IS NULL OR length(trim(_row.name_ar)) = 0 THEN
    RAISE EXCEPTION 'NAME_REQUIRED';
  END IF;

  UPDATE public.private_sectors
  SET status = 'pending', submitted_at = now(), rejection_reason = NULL
  WHERE id = _id
  RETURNING * INTO _row;
  RETURN _row;
END;
$$;

-- Admin review (approve / reject / suspend / reset to draft)
CREATE OR REPLACE FUNCTION public.review_private_sector(
  _id UUID,
  _decision public.private_sector_status,
  _reason TEXT DEFAULT NULL
)
RETURNS public.private_sectors
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _row public.private_sectors;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;
  IF _decision NOT IN ('approved','rejected','suspended','draft') THEN
    RAISE EXCEPTION 'INVALID_DECISION';
  END IF;

  UPDATE public.private_sectors
  SET status = _decision,
      rejection_reason = CASE WHEN _decision = 'rejected' THEN _reason ELSE NULL END,
      reviewed_by = auth.uid(),
      reviewed_at = now()
  WHERE id = _id
  RETURNING * INTO _row;

  IF NOT FOUND THEN RAISE EXCEPTION 'NOT_FOUND'; END IF;
  RETURN _row;
END;
$$;

-- Review distributor link
CREATE OR REPLACE FUNCTION public.review_private_sector_distributor(
  _id UUID,
  _decision public.private_sector_link_status
)
RETURNS public.private_sector_distributors
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _link public.private_sector_distributors;
  _sector public.private_sectors;
BEGIN
  SELECT * INTO _link FROM public.private_sector_distributors WHERE id = _id;
  IF NOT FOUND THEN RAISE EXCEPTION 'NOT_FOUND'; END IF;
  SELECT * INTO _sector FROM public.private_sectors WHERE id = _link.sector_id;

  IF NOT (public.has_role(auth.uid(), 'admin')
          OR public.user_can_manage_business(_sector.business_id)) THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;
  IF _decision NOT IN ('approved','rejected','revoked','pending') THEN
    RAISE EXCEPTION 'INVALID_DECISION';
  END IF;

  UPDATE public.private_sector_distributors
  SET status = _decision, reviewed_by = auth.uid(), reviewed_at = now()
  WHERE id = _id
  RETURNING * INTO _link;
  RETURN _link;
END;
$$;

GRANT EXECUTE ON FUNCTION public.submit_private_sector(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.review_private_sector(UUID, public.private_sector_status, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.review_private_sector_distributor(UUID, public.private_sector_link_status) TO authenticated;