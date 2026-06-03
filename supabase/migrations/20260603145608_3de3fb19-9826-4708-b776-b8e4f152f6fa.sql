
-- ============================================================================
-- PROVIDER-LEAD-INTAKE-FORM-1
-- ============================================================================

-- 1. Status enum
DO $$ BEGIN
  CREATE TYPE public.provider_lead_status AS ENUM (
    'new','under_review','needs_info','approved','rejected','converted_to_business'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.provider_lead_channel AS ENUM ('phone','whatsapp','email');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2. Sequence for reference code (PRV-1000001+)
CREATE SEQUENCE IF NOT EXISTS public.provider_leads_ref_seq START 1000000 INCREMENT 1;

-- 3. Main table
CREATE TABLE IF NOT EXISTS public.provider_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reference_code text UNIQUE,
  name_ar text NOT NULL,
  name_en text,
  contact_name text NOT NULL,
  email text NOT NULL,
  phone text NOT NULL,
  preferred_channel public.provider_lead_channel NOT NULL DEFAULT 'phone',
  website text,
  cr_number text,
  unified_number text,
  vat_number text,
  main_activity text,
  specialties text[] NOT NULL DEFAULT '{}',
  brands text[] NOT NULL DEFAULT '{}',
  brief text,
  cr_file_path text,
  map_link text,
  national_address text,
  city text,
  branches_count int NOT NULL DEFAULT 1,
  status public.provider_lead_status NOT NULL DEFAULT 'new',
  admin_notes text,
  linked_business_id uuid REFERENCES public.businesses(id) ON DELETE SET NULL,
  submitted_ip_hash text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz,
  reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  CONSTRAINT provider_leads_name_ar_len CHECK (char_length(name_ar) BETWEEN 2 AND 200),
  CONSTRAINT provider_leads_email_len CHECK (char_length(email) BETWEEN 5 AND 255),
  CONSTRAINT provider_leads_phone_len CHECK (char_length(phone) BETWEEN 7 AND 20),
  CONSTRAINT provider_leads_brief_len CHECK (brief IS NULL OR char_length(brief) <= 2000)
);

-- 4. Branches child table
CREATE TABLE IF NOT EXISTS public.provider_lead_branches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES public.provider_leads(id) ON DELETE CASCADE,
  branch_name text NOT NULL,
  city text,
  address text,
  map_link text,
  phone text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT provider_lead_branches_name_len CHECK (char_length(branch_name) BETWEEN 1 AND 200)
);

CREATE INDEX IF NOT EXISTS idx_provider_lead_branches_lead_id ON public.provider_lead_branches(lead_id);
CREATE INDEX IF NOT EXISTS idx_provider_leads_status ON public.provider_leads(status);
CREATE INDEX IF NOT EXISTS idx_provider_leads_created_at ON public.provider_leads(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_provider_leads_ip_hash_created ON public.provider_leads(submitted_ip_hash, created_at);

-- 5. Dedup partial unique indexes (open requests only)
CREATE UNIQUE INDEX IF NOT EXISTS uniq_provider_leads_open_email
  ON public.provider_leads (lower(email))
  WHERE status IN ('new','under_review','needs_info');

CREATE UNIQUE INDEX IF NOT EXISTS uniq_provider_leads_open_phone
  ON public.provider_leads (regexp_replace(phone, '\D', '', 'g'))
  WHERE status IN ('new','under_review','needs_info');

CREATE UNIQUE INDEX IF NOT EXISTS uniq_provider_leads_open_cr
  ON public.provider_leads (cr_number)
  WHERE cr_number IS NOT NULL AND status IN ('new','under_review','needs_info');

CREATE UNIQUE INDEX IF NOT EXISTS uniq_provider_leads_open_unified
  ON public.provider_leads (unified_number)
  WHERE unified_number IS NOT NULL AND status IN ('new','under_review','needs_info');

-- 6. Reference code trigger
CREATE OR REPLACE FUNCTION public.set_provider_lead_reference_code()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.reference_code IS NULL THEN
    NEW.reference_code := 'PRV-' || lpad(nextval('public.provider_leads_ref_seq')::text, 7, '0');
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_provider_leads_ref_code ON public.provider_leads;
CREATE TRIGGER trg_provider_leads_ref_code
  BEFORE INSERT ON public.provider_leads
  FOR EACH ROW EXECUTE FUNCTION public.set_provider_lead_reference_code();

-- 7. updated_at trigger (reuses generic helper if it exists, else inline)
CREATE OR REPLACE FUNCTION public.touch_provider_lead_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at := now(); RETURN NEW; END $$;

DROP TRIGGER IF EXISTS trg_provider_leads_touch ON public.provider_leads;
CREATE TRIGGER trg_provider_leads_touch
  BEFORE UPDATE ON public.provider_leads
  FOR EACH ROW EXECUTE FUNCTION public.touch_provider_lead_updated_at();

-- 8. GRANTs
GRANT SELECT, INSERT, UPDATE, DELETE ON public.provider_leads TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.provider_lead_branches TO authenticated;
GRANT ALL ON public.provider_leads TO service_role;
GRANT ALL ON public.provider_lead_branches TO service_role;
GRANT USAGE ON SEQUENCE public.provider_leads_ref_seq TO authenticated, service_role;

-- 9. RLS
ALTER TABLE public.provider_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.provider_lead_branches ENABLE ROW LEVEL SECURITY;

-- Admins only for SELECT/UPDATE/DELETE; INSERT happens only via SECURITY DEFINER RPC.
DROP POLICY IF EXISTS provider_leads_admin_select ON public.provider_leads;
CREATE POLICY provider_leads_admin_select ON public.provider_leads
  FOR SELECT TO authenticated
  USING (public.has_admin_access(auth.uid()));

DROP POLICY IF EXISTS provider_leads_admin_update ON public.provider_leads;
CREATE POLICY provider_leads_admin_update ON public.provider_leads
  FOR UPDATE TO authenticated
  USING (public.has_admin_access(auth.uid()))
  WITH CHECK (public.has_admin_access(auth.uid()));

DROP POLICY IF EXISTS provider_leads_admin_delete ON public.provider_leads;
CREATE POLICY provider_leads_admin_delete ON public.provider_leads
  FOR DELETE TO authenticated
  USING (public.has_admin_access(auth.uid()));

DROP POLICY IF EXISTS provider_lead_branches_admin_select ON public.provider_lead_branches;
CREATE POLICY provider_lead_branches_admin_select ON public.provider_lead_branches
  FOR SELECT TO authenticated
  USING (public.has_admin_access(auth.uid()));

DROP POLICY IF EXISTS provider_lead_branches_admin_update ON public.provider_lead_branches;
CREATE POLICY provider_lead_branches_admin_update ON public.provider_lead_branches
  FOR ALL TO authenticated
  USING (public.has_admin_access(auth.uid()))
  WITH CHECK (public.has_admin_access(auth.uid()));

-- 10. Submission RPC (SECURITY DEFINER, callable by anon + authenticated)
CREATE OR REPLACE FUNCTION public.submit_provider_lead(payload jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_lead_id uuid;
  v_ref text;
  v_email text;
  v_phone text;
  v_phone_norm text;
  v_cr text;
  v_unified text;
  v_ip_hash text;
  v_branch jsonb;
  v_recent_count int;
BEGIN
  -- Required field shape
  v_email := lower(trim(coalesce(payload->>'email','')));
  v_phone := trim(coalesce(payload->>'phone',''));
  v_phone_norm := regexp_replace(v_phone, '\D', '', 'g');
  v_cr := nullif(trim(coalesce(payload->>'cr_number','')), '');
  v_unified := nullif(trim(coalesce(payload->>'unified_number','')), '');
  v_ip_hash := nullif(trim(coalesce(payload->>'ip_hash','')), '');

  IF v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' THEN
    RAISE EXCEPTION 'invalid_email' USING ERRCODE = '22023';
  END IF;
  IF char_length(v_phone_norm) < 7 OR char_length(v_phone_norm) > 15 THEN
    RAISE EXCEPTION 'invalid_phone' USING ERRCODE = '22023';
  END IF;

  -- Per-IP rate limit: max 5 submissions per hour
  IF v_ip_hash IS NOT NULL THEN
    SELECT count(*) INTO v_recent_count
    FROM public.provider_leads
    WHERE submitted_ip_hash = v_ip_hash
      AND created_at > now() - interval '1 hour';
    IF v_recent_count >= 5 THEN
      RAISE EXCEPTION 'rate_limited' USING ERRCODE = 'P0001';
    END IF;
  END IF;

  -- Dedup pre-check (gives nicer error than unique violation)
  IF EXISTS (
    SELECT 1 FROM public.provider_leads
    WHERE status IN ('new','under_review','needs_info')
      AND (
        lower(email) = v_email
        OR regexp_replace(phone, '\D', '', 'g') = v_phone_norm
        OR (v_cr IS NOT NULL AND cr_number = v_cr)
        OR (v_unified IS NOT NULL AND unified_number = v_unified)
      )
  ) THEN
    RAISE EXCEPTION 'duplicate_request' USING ERRCODE = 'P0001';
  END IF;

  INSERT INTO public.provider_leads (
    name_ar, name_en, contact_name, email, phone, preferred_channel,
    website, cr_number, unified_number, vat_number, main_activity,
    specialties, brands, brief, cr_file_path, map_link,
    national_address, city, branches_count,
    submitted_ip_hash, user_agent
  ) VALUES (
    trim(payload->>'name_ar'),
    nullif(trim(coalesce(payload->>'name_en','')), ''),
    trim(payload->>'contact_name'),
    v_email,
    v_phone,
    coalesce((payload->>'preferred_channel')::public.provider_lead_channel, 'phone'),
    nullif(trim(coalesce(payload->>'website','')), ''),
    v_cr,
    v_unified,
    nullif(trim(coalesce(payload->>'vat_number','')), ''),
    nullif(trim(coalesce(payload->>'main_activity','')), ''),
    COALESCE(ARRAY(SELECT jsonb_array_elements_text(payload->'specialties')), '{}'),
    COALESCE(ARRAY(SELECT jsonb_array_elements_text(payload->'brands')), '{}'),
    nullif(trim(coalesce(payload->>'brief','')), ''),
    nullif(trim(coalesce(payload->>'cr_file_path','')), ''),
    nullif(trim(coalesce(payload->>'map_link','')), ''),
    nullif(trim(coalesce(payload->>'national_address','')), ''),
    nullif(trim(coalesce(payload->>'city','')), ''),
    greatest(1, coalesce((payload->>'branches_count')::int, 1)),
    v_ip_hash,
    nullif(trim(coalesce(payload->>'user_agent','')), '')
  )
  RETURNING id, reference_code INTO v_lead_id, v_ref;

  -- Branches
  IF jsonb_typeof(payload->'branches') = 'array' THEN
    FOR v_branch IN SELECT * FROM jsonb_array_elements(payload->'branches') LOOP
      IF coalesce(trim(v_branch->>'branch_name'), '') <> '' THEN
        INSERT INTO public.provider_lead_branches (
          lead_id, branch_name, city, address, map_link, phone
        ) VALUES (
          v_lead_id,
          left(trim(v_branch->>'branch_name'), 200),
          nullif(trim(coalesce(v_branch->>'city','')), ''),
          nullif(trim(coalesce(v_branch->>'address','')), ''),
          nullif(trim(coalesce(v_branch->>'map_link','')), ''),
          nullif(trim(coalesce(v_branch->>'phone','')), '')
        );
      END IF;
    END LOOP;
  END IF;

  RETURN jsonb_build_object(
    'lead_id', v_lead_id,
    'reference_code', v_ref
  );
END $$;

REVOKE ALL ON FUNCTION public.submit_provider_lead(jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_provider_lead(jsonb) TO anon, authenticated;

-- 11. Admin update RPC (status + notes + linked business)
CREATE OR REPLACE FUNCTION public.admin_update_provider_lead(
  p_lead_id uuid,
  p_status public.provider_lead_status,
  p_admin_notes text DEFAULT NULL,
  p_linked_business_id uuid DEFAULT NULL
) RETURNS public.provider_leads
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_row public.provider_leads;
BEGIN
  IF NOT public.has_admin_access(auth.uid()) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;
  UPDATE public.provider_leads
     SET status = p_status,
         admin_notes = COALESCE(p_admin_notes, admin_notes),
         linked_business_id = COALESCE(p_linked_business_id, linked_business_id),
         reviewed_at = now(),
         reviewed_by = auth.uid()
   WHERE id = p_lead_id
   RETURNING * INTO v_row;
  RETURN v_row;
END $$;

REVOKE ALL ON FUNCTION public.admin_update_provider_lead(uuid, public.provider_lead_status, text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_update_provider_lead(uuid, public.provider_lead_status, text, uuid) TO authenticated;

-- 12. Storage bucket policies (bucket itself created via storage_create_bucket tool)
-- Anyone can INSERT only into the prv-leads/ prefix; only admins can SELECT/DELETE.
DROP POLICY IF EXISTS provider_lead_docs_public_insert ON storage.objects;
CREATE POLICY provider_lead_docs_public_insert ON storage.objects
  FOR INSERT TO anon, authenticated
  WITH CHECK (
    bucket_id = 'provider-lead-documents'
    AND (storage.foldername(name))[1] = 'prv-leads'
  );

DROP POLICY IF EXISTS provider_lead_docs_admin_select ON storage.objects;
CREATE POLICY provider_lead_docs_admin_select ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'provider-lead-documents'
    AND public.has_admin_access(auth.uid())
  );

DROP POLICY IF EXISTS provider_lead_docs_admin_delete ON storage.objects;
CREATE POLICY provider_lead_docs_admin_delete ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'provider-lead-documents'
    AND public.has_admin_access(auth.uid())
  );
