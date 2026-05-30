
-- ============================================================
-- BRANDS-GOVERNANCE-1 — Phase 1 schema migration
-- ============================================================

-- 1. SECTORS REGISTRY ---------------------------------------------------
CREATE TABLE IF NOT EXISTS public.sectors (
  id text PRIMARY KEY,
  name_ar text NOT NULL,
  name_en text NOT NULL,
  icon text,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.sectors TO anon, authenticated;
GRANT ALL ON public.sectors TO service_role;

ALTER TABLE public.sectors ENABLE ROW LEVEL SECURITY;

CREATE POLICY sectors_public_read ON public.sectors
  FOR SELECT USING (true);

CREATE POLICY sectors_admin_write ON public.sectors
  FOR ALL TO authenticated
  USING (public.has_admin_access(auth.uid()))
  WITH CHECK (public.has_admin_access(auth.uid()));

-- Seed sectors from onboarding-sectors.ts canonical list
INSERT INTO public.sectors (id, name_ar, name_en, sort_order) VALUES
  ('aluminum',           'الألمنيوم',                'Aluminum',            10),
  ('glass',              'الزجاج',                   'Glass',               20),
  ('iron',               'الحديد',                   'Iron',                30),
  ('stainless_steel',    'الستانلس ستيل',            'Stainless Steel',     40),
  ('wood',               'الأخشاب',                  'Wood',                50),
  ('cabinets',           'الدواليب والخزائن',        'Cabinets',            60),
  ('gypsum_decoration',  'الجبس والديكور',           'Gypsum & Decoration', 70),
  ('paint',              'الدهانات',                 'Paint',               80),
  ('ceramic',            'السيراميك والبلاط',        'Ceramic & Tiles',     90),
  ('plumbing',           'السباكة',                  'Plumbing',           100),
  ('electrical',         'الكهرباء',                 'Electrical',         110),
  ('hvac',               'التكييف والتبريد',         'HVAC',               120),
  ('flooring',           'الأرضيات',                 'Flooring',           130)
ON CONFLICT (id) DO NOTHING;

-- 2. REF-ID SEQUENCES (reseed + add PBL) --------------------------------
-- Existing brand sequences started at 1000 instead of 1000001; bump them.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname='seq_brand' AND relkind='S') THEN
    PERFORM setval('public.seq_brand', GREATEST(nextval('public.seq_brand'), 1000001), false);
  END IF;
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname='seq_brand_request' AND relkind='S') THEN
    PERFORM setval('public.seq_brand_request', GREATEST(nextval('public.seq_brand_request'), 1000001), false);
  END IF;
END$$;

CREATE SEQUENCE IF NOT EXISTS public.seq_pbl START 1000001;

-- 3. BRAND CATALOG — extend ---------------------------------------------
ALTER TABLE public.brand_catalog
  ADD COLUMN IF NOT EXISTS description_ar text,
  ADD COLUMN IF NOT EXISTS description_en text,
  ADD COLUMN IF NOT EXISTS country_of_origin_code text,
  ADD COLUMN IF NOT EXISTS country_of_origin_name_ar text,
  ADD COLUMN IF NOT EXISTS country_of_origin_name_en text,
  ADD COLUMN IF NOT EXISTS brand_owner_company text,
  ADD COLUMN IF NOT EXISTS founded_year integer,
  ADD COLUMN IF NOT EXISTS is_local boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_verified boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'approved',
  ADD COLUMN IF NOT EXISTS verification_status text NOT NULL DEFAULT 'unverified',
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'admin',
  ADD COLUMN IF NOT EXISTS submitted_by uuid,
  ADD COLUMN IF NOT EXISTS approved_by uuid,
  ADD COLUMN IF NOT EXISTS approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS rejection_reason text,
  ADD COLUMN IF NOT EXISTS merged_into_brand_id uuid REFERENCES public.brand_catalog(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.brand_catalog
  DROP CONSTRAINT IF EXISTS brand_catalog_status_chk;
ALTER TABLE public.brand_catalog
  ADD CONSTRAINT brand_catalog_status_chk
  CHECK (status IN ('draft','pending','in_review','approved','rejected','archived','merged'));

ALTER TABLE public.brand_catalog
  DROP CONSTRAINT IF EXISTS brand_catalog_verification_status_chk;
ALTER TABLE public.brand_catalog
  ADD CONSTRAINT brand_catalog_verification_status_chk
  CHECK (verification_status IN ('unverified','claimed','verified','official'));

CREATE INDEX IF NOT EXISTS idx_brand_catalog_status ON public.brand_catalog(status);
CREATE INDEX IF NOT EXISTS idx_brand_catalog_country ON public.brand_catalog(country_of_origin_code);
CREATE INDEX IF NOT EXISTS idx_brand_catalog_slug ON public.brand_catalog(slug);

-- 4. BRAND MANUFACTURING COUNTRIES --------------------------------------
CREATE TABLE IF NOT EXISTS public.brand_manufacturing_countries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id uuid NOT NULL REFERENCES public.brand_catalog(id) ON DELETE CASCADE,
  country_code text NOT NULL,
  country_name_ar text,
  country_name_en text,
  manufacturing_type text NOT NULL DEFAULT 'unknown'
    CHECK (manufacturing_type IN ('main_factory','licensed_factory','assembly','outsourced','unknown')),
  notes_ar text,
  notes_en text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (brand_id, country_code, manufacturing_type)
);

GRANT SELECT ON public.brand_manufacturing_countries TO anon, authenticated;
GRANT ALL ON public.brand_manufacturing_countries TO service_role;

ALTER TABLE public.brand_manufacturing_countries ENABLE ROW LEVEL SECURITY;

CREATE POLICY bmc_public_read_approved ON public.brand_manufacturing_countries
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.brand_catalog b
            WHERE b.id = brand_id AND b.status = 'approved')
    OR public.has_admin_access(auth.uid())
  );

CREATE POLICY bmc_admin_write ON public.brand_manufacturing_countries
  FOR ALL TO authenticated
  USING (public.has_admin_access(auth.uid()))
  WITH CHECK (public.has_admin_access(auth.uid()));

-- 5. BRAND-SECTOR LINKS -------------------------------------------------
CREATE TABLE IF NOT EXISTS public.brand_sector_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id uuid NOT NULL REFERENCES public.brand_catalog(id) ON DELETE CASCADE,
  sector_id text NOT NULL REFERENCES public.sectors(id) ON DELETE RESTRICT,
  is_primary boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (brand_id, sector_id)
);

CREATE INDEX IF NOT EXISTS idx_bsl_sector ON public.brand_sector_links(sector_id);

GRANT SELECT ON public.brand_sector_links TO anon, authenticated;
GRANT ALL ON public.brand_sector_links TO service_role;

ALTER TABLE public.brand_sector_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY bsl_public_read_approved ON public.brand_sector_links
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.brand_catalog b
            WHERE b.id = brand_id AND b.status = 'approved')
    OR public.has_admin_access(auth.uid())
  );

CREATE POLICY bsl_admin_write ON public.brand_sector_links
  FOR ALL TO authenticated
  USING (public.has_admin_access(auth.uid()))
  WITH CHECK (public.has_admin_access(auth.uid()));

-- 6. PROVIDER-BRAND LINKS (extend business_service_brands) --------------
ALTER TABLE public.business_service_brands
  ADD COLUMN IF NOT EXISTS ref_id text UNIQUE,
  ADD COLUMN IF NOT EXISTS relationship_type text NOT NULL DEFAULT 'reseller',
  ADD COLUMN IF NOT EXISTS authorization_status text NOT NULL DEFAULT 'unverified',
  ADD COLUMN IF NOT EXISTS authorization_document_url text,
  ADD COLUMN IF NOT EXISTS authorization_starts_at date,
  ADD COLUMN IF NOT EXISTS authorization_ends_at date,
  ADD COLUMN IF NOT EXISTS submitted_by uuid,
  ADD COLUMN IF NOT EXISTS reviewed_by uuid,
  ADD COLUMN IF NOT EXISTS reviewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS rejection_reason text,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

ALTER TABLE public.business_service_brands
  DROP CONSTRAINT IF EXISTS bsb_relationship_chk;
ALTER TABLE public.business_service_brands
  ADD CONSTRAINT bsb_relationship_chk
  CHECK (relationship_type IN (
    'manufacturer','official_agent','authorized_distributor','distributor',
    'reseller','importer','installer','fabricator','maintenance_provider',
    'showroom','supplier','other'));

ALTER TABLE public.business_service_brands
  DROP CONSTRAINT IF EXISTS bsb_authstatus_chk;
ALTER TABLE public.business_service_brands
  ADD CONSTRAINT bsb_authstatus_chk
  CHECK (authorization_status IN ('unverified','pending','verified','rejected','expired'));

CREATE OR REPLACE FUNCTION public.set_pbl_ref_id()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.ref_id IS NULL OR NEW.ref_id = '' THEN
    NEW.ref_id := 'PBL-' || lpad(nextval('public.seq_pbl')::text, 7, '0');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_pbl_ref_id ON public.business_service_brands;
CREATE TRIGGER trg_pbl_ref_id BEFORE INSERT ON public.business_service_brands
  FOR EACH ROW EXECUTE FUNCTION public.set_pbl_ref_id();

-- Backfill ref_ids for existing rows
UPDATE public.business_service_brands
SET ref_id = 'PBL-' || lpad(nextval('public.seq_pbl')::text, 7, '0')
WHERE ref_id IS NULL;

-- 7. BRAND REQUESTS — extend --------------------------------------------
ALTER TABLE public.brand_addition_requests
  ADD COLUMN IF NOT EXISTS request_type text NOT NULL DEFAULT 'create_brand',
  ADD COLUMN IF NOT EXISTS brand_id uuid REFERENCES public.brand_catalog(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS proposed_country_of_origin_code text,
  ADD COLUMN IF NOT EXISTS proposed_manufacturing_countries jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS proposed_sector_ids text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS proposed_service_ids uuid[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS relationship_type text,
  ADD COLUMN IF NOT EXISTS documents jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS notes text,
  ADD COLUMN IF NOT EXISTS admin_notes text;

ALTER TABLE public.brand_addition_requests
  DROP CONSTRAINT IF EXISTS bar_request_type_chk;
ALTER TABLE public.brand_addition_requests
  ADD CONSTRAINT bar_request_type_chk
  CHECK (request_type IN ('create_brand','claim_brand','link_provider','update_brand','report_duplicate'));

CREATE INDEX IF NOT EXISTS idx_bar_status ON public.brand_addition_requests(status);
CREATE INDEX IF NOT EXISTS idx_bar_request_type ON public.brand_addition_requests(request_type);

-- 8. BRAND AUDIT LOGS ---------------------------------------------------
CREATE TABLE IF NOT EXISTS public.brand_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id uuid REFERENCES public.brand_catalog(id) ON DELETE CASCADE,
  brand_request_id uuid REFERENCES public.brand_addition_requests(id) ON DELETE SET NULL,
  provider_brand_link_id uuid REFERENCES public.business_service_brands(id) ON DELETE SET NULL,
  actor_id uuid,
  action text NOT NULL,
  old_values jsonb,
  new_values jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bal_brand ON public.brand_audit_logs(brand_id);
CREATE INDEX IF NOT EXISTS idx_bal_created ON public.brand_audit_logs(created_at DESC);

GRANT SELECT, INSERT ON public.brand_audit_logs TO authenticated;
GRANT ALL ON public.brand_audit_logs TO service_role;

ALTER TABLE public.brand_audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY bal_admin_read ON public.brand_audit_logs
  FOR SELECT TO authenticated
  USING (public.has_admin_access(auth.uid()));

CREATE POLICY bal_admin_insert ON public.brand_audit_logs
  FOR INSERT TO authenticated
  WITH CHECK (public.has_admin_access(auth.uid()) OR actor_id = auth.uid());

-- 9. PUBLIC VIEW: approved brands only ----------------------------------
DROP VIEW IF EXISTS public.brands_public;
CREATE VIEW public.brands_public
WITH (security_invoker = true)
AS
SELECT
  b.id, b.ref_id, b.name_ar, b.name_en, b.slug,
  b.description_ar, b.description_en, b.logo_url, b.website,
  b.country_of_origin_code, b.country_of_origin_name_ar, b.country_of_origin_name_en,
  b.brand_owner_company, b.founded_year, b.is_local, b.is_verified,
  b.verification_status, b.sector_id,
  b.created_at
FROM public.brand_catalog b
WHERE b.status = 'approved';

GRANT SELECT ON public.brands_public TO anon, authenticated;

-- 10. APPROVAL / REJECTION RPCs -----------------------------------------
CREATE OR REPLACE FUNCTION public.admin_approve_brand(_brand_id uuid)
RETURNS public.brand_catalog
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _row public.brand_catalog;
BEGIN
  IF NOT public.has_admin_access(auth.uid()) THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;
  UPDATE public.brand_catalog
     SET status='approved', approved_by=auth.uid(), approved_at=now(), rejection_reason=NULL
   WHERE id=_brand_id
   RETURNING * INTO _row;
  INSERT INTO public.brand_audit_logs(brand_id, actor_id, action, new_values)
    VALUES (_brand_id, auth.uid(), 'brand_approved', jsonb_build_object('status','approved'));
  RETURN _row;
END;$$;

CREATE OR REPLACE FUNCTION public.admin_reject_brand(_brand_id uuid, _reason text)
RETURNS public.brand_catalog
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _row public.brand_catalog;
BEGIN
  IF NOT public.has_admin_access(auth.uid()) THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;
  UPDATE public.brand_catalog
     SET status='rejected', rejection_reason=_reason, approved_by=auth.uid(), approved_at=now()
   WHERE id=_brand_id
   RETURNING * INTO _row;
  INSERT INTO public.brand_audit_logs(brand_id, actor_id, action, new_values)
    VALUES (_brand_id, auth.uid(), 'brand_rejected', jsonb_build_object('reason',_reason));
  RETURN _row;
END;$$;

CREATE OR REPLACE FUNCTION public.admin_archive_brand(_brand_id uuid)
RETURNS public.brand_catalog
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _row public.brand_catalog;
BEGIN
  IF NOT public.has_admin_access(auth.uid()) THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;
  UPDATE public.brand_catalog SET status='archived'
   WHERE id=_brand_id RETURNING * INTO _row;
  INSERT INTO public.brand_audit_logs(brand_id, actor_id, action)
    VALUES (_brand_id, auth.uid(), 'brand_archived');
  RETURN _row;
END;$$;

CREATE OR REPLACE FUNCTION public.admin_merge_brands(_source_id uuid, _target_id uuid)
RETURNS public.brand_catalog
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _row public.brand_catalog;
BEGIN
  IF NOT public.has_admin_access(auth.uid()) THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;
  IF _source_id = _target_id THEN
    RAISE EXCEPTION 'cannot merge a brand into itself';
  END IF;

  -- Move sector links (ignore conflicts)
  INSERT INTO public.brand_sector_links (brand_id, sector_id, is_primary)
  SELECT _target_id, sector_id, false
    FROM public.brand_sector_links WHERE brand_id = _source_id
  ON CONFLICT (brand_id, sector_id) DO NOTHING;
  DELETE FROM public.brand_sector_links WHERE brand_id = _source_id;

  -- Move manufacturing countries
  INSERT INTO public.brand_manufacturing_countries
    (brand_id, country_code, country_name_ar, country_name_en, manufacturing_type, notes_ar, notes_en)
  SELECT _target_id, country_code, country_name_ar, country_name_en, manufacturing_type, notes_ar, notes_en
    FROM public.brand_manufacturing_countries WHERE brand_id = _source_id
  ON CONFLICT (brand_id, country_code, manufacturing_type) DO NOTHING;
  DELETE FROM public.brand_manufacturing_countries WHERE brand_id = _source_id;

  -- Repoint provider-brand links
  UPDATE public.business_service_brands SET brand_id = _target_id WHERE brand_id = _source_id;

  -- Repoint requests
  UPDATE public.brand_addition_requests SET brand_id = _target_id WHERE brand_id = _source_id;

  UPDATE public.brand_catalog
     SET status='merged', merged_into_brand_id=_target_id
   WHERE id=_source_id
   RETURNING * INTO _row;

  INSERT INTO public.brand_audit_logs(brand_id, actor_id, action, new_values)
    VALUES (_source_id, auth.uid(), 'brand_merged',
            jsonb_build_object('merged_into_brand_id', _target_id));
  RETURN _row;
END;$$;

CREATE OR REPLACE FUNCTION public.admin_approve_provider_brand_link(_link_id uuid)
RETURNS public.business_service_brands
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _row public.business_service_brands;
BEGIN
  IF NOT public.has_admin_access(auth.uid()) THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;
  UPDATE public.business_service_brands
     SET authorization_status='verified', reviewed_by=auth.uid(), reviewed_at=now(), rejection_reason=NULL
   WHERE id=_link_id RETURNING * INTO _row;
  INSERT INTO public.brand_audit_logs(provider_brand_link_id, actor_id, action)
    VALUES (_link_id, auth.uid(), 'provider_brand_link_approved');
  RETURN _row;
END;$$;

CREATE OR REPLACE FUNCTION public.admin_reject_provider_brand_link(_link_id uuid, _reason text)
RETURNS public.business_service_brands
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _row public.business_service_brands;
BEGIN
  IF NOT public.has_admin_access(auth.uid()) THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;
  UPDATE public.business_service_brands
     SET authorization_status='rejected', reviewed_by=auth.uid(), reviewed_at=now(), rejection_reason=_reason
   WHERE id=_link_id RETURNING * INTO _row;
  INSERT INTO public.brand_audit_logs(provider_brand_link_id, actor_id, action, new_values)
    VALUES (_link_id, auth.uid(), 'provider_brand_link_rejected', jsonb_build_object('reason',_reason));
  RETURN _row;
END;$$;

GRANT EXECUTE ON FUNCTION public.admin_approve_brand(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_reject_brand(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_archive_brand(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_merge_brands(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_approve_provider_brand_link(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_reject_provider_brand_link(uuid, text) TO authenticated;
