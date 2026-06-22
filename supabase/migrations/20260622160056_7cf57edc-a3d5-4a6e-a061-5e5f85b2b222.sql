
-- 1) Table
CREATE TABLE public.client_site_licenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id uuid NOT NULL REFERENCES public.client_sites(id) ON DELETE CASCADE,
  owner_user_id uuid NOT NULL,
  business_id uuid NULL,
  license_type text NOT NULL DEFAULT 'license',
  title text NOT NULL,
  issuer_name text NULL,
  license_number text NULL,
  issue_date date NULL,
  expiry_date date NULL,
  status text NOT NULL DEFAULT 'active',
  file_id uuid NULL REFERENCES public.client_site_files(id) ON DELETE SET NULL,
  notes text NULL,
  is_archived boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT csl_type_chk CHECK (
    license_type IN ('license','permit','municipality','civil_defense','safety','insurance','other')
  ),
  CONSTRAINT csl_status_chk CHECK (
    status IN ('active','expired','pending','rejected','archived')
  ),
  CONSTRAINT csl_title_len_chk      CHECK (char_length(title) BETWEEN 1 AND 200),
  CONSTRAINT csl_issuer_len_chk     CHECK (issuer_name IS NULL OR char_length(issuer_name) <= 160),
  CONSTRAINT csl_license_no_len_chk CHECK (license_number IS NULL OR char_length(license_number) <= 80),
  CONSTRAINT csl_notes_len_chk      CHECK (notes IS NULL OR char_length(notes) <= 2000),
  CONSTRAINT csl_dates_chk          CHECK (expiry_date IS NULL OR issue_date IS NULL OR expiry_date >= issue_date)
);

-- 2) Grants — auth-only; no anon access
GRANT SELECT, INSERT, UPDATE ON public.client_site_licenses TO authenticated;
GRANT ALL ON public.client_site_licenses TO service_role;
REVOKE DELETE ON public.client_site_licenses FROM authenticated;
REVOKE ALL    ON public.client_site_licenses FROM anon;

-- 3) Indexes
CREATE INDEX idx_csl_site          ON public.client_site_licenses(site_id);
CREATE INDEX idx_csl_owner         ON public.client_site_licenses(owner_user_id);
CREATE INDEX idx_csl_site_archived ON public.client_site_licenses(site_id, is_archived);
CREATE INDEX idx_csl_expiry        ON public.client_site_licenses(expiry_date);
CREATE INDEX idx_csl_status        ON public.client_site_licenses(status);

-- 4) RLS
ALTER TABLE public.client_site_licenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "csl_select_owner_or_site_member"
ON public.client_site_licenses FOR SELECT
TO authenticated
USING (
  owner_user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.client_sites s
    WHERE s.id = client_site_licenses.site_id
      AND (s.owner_user_id = auth.uid() OR s.client_user_id = auth.uid() OR s.created_by = auth.uid())
  )
  OR public.has_role(auth.uid(), 'admin'::public.app_role)
);

CREATE POLICY "csl_insert_owner_of_site"
ON public.client_site_licenses FOR INSERT
TO authenticated
WITH CHECK (
  owner_user_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.client_sites s
    WHERE s.id = site_id
      AND (s.owner_user_id = auth.uid() OR s.client_user_id = auth.uid() OR s.created_by = auth.uid())
  )
);

CREATE POLICY "csl_update_owner_or_site_owner"
ON public.client_site_licenses FOR UPDATE
TO authenticated
USING (
  owner_user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.client_sites s
    WHERE s.id = client_site_licenses.site_id
      AND (s.owner_user_id = auth.uid() OR s.client_user_id = auth.uid())
  )
)
WITH CHECK (
  owner_user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.client_sites s
    WHERE s.id = client_site_licenses.site_id
      AND (s.owner_user_id = auth.uid() OR s.client_user_id = auth.uid())
  )
);

-- 5) Immutability + file/site coherence trigger
CREATE OR REPLACE FUNCTION public.client_site_licenses_enforce_invariants()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_file_site uuid;
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF NEW.site_id IS DISTINCT FROM OLD.site_id THEN
      RAISE EXCEPTION 'site_id is immutable on client_site_licenses';
    END IF;
    IF NEW.owner_user_id IS DISTINCT FROM OLD.owner_user_id THEN
      RAISE EXCEPTION 'owner_user_id is immutable on client_site_licenses';
    END IF;
    NEW.updated_at := now();
  END IF;

  -- file_id (if set) must belong to the same site
  IF NEW.file_id IS NOT NULL THEN
    SELECT site_id INTO v_file_site
    FROM public.client_site_files
    WHERE id = NEW.file_id;
    IF v_file_site IS NULL THEN
      RAISE EXCEPTION 'file_id % does not exist in client_site_files', NEW.file_id;
    END IF;
    IF v_file_site IS DISTINCT FROM NEW.site_id THEN
      RAISE EXCEPTION 'file_id belongs to a different site (got % expected %)', v_file_site, NEW.site_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_client_site_licenses_invariants
BEFORE INSERT OR UPDATE ON public.client_site_licenses
FOR EACH ROW EXECUTE FUNCTION public.client_site_licenses_enforce_invariants();
