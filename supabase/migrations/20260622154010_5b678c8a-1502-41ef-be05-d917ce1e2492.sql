
-- 1) Table
CREATE TABLE public.client_site_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id uuid NOT NULL REFERENCES public.client_sites(id) ON DELETE CASCADE,
  owner_user_id uuid NOT NULL,
  business_id uuid NULL,
  file_name text NOT NULL,
  file_type text NULL,
  file_size_bytes bigint NULL,
  storage_bucket text NOT NULL,
  storage_path text NOT NULL,
  file_category text NOT NULL DEFAULT 'general',
  description text NULL,
  is_archived boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT client_site_files_category_chk CHECK (
    file_category IN ('general','license','permit','contract','invoice','photo','other')
  ),
  CONSTRAINT client_site_files_name_len_chk CHECK (
    char_length(file_name) BETWEEN 1 AND 255
  ),
  CONSTRAINT client_site_files_size_nonneg_chk CHECK (
    file_size_bytes IS NULL OR file_size_bytes >= 0
  ),
  CONSTRAINT client_site_files_storage_unique UNIQUE (storage_bucket, storage_path)
);

-- 2) Grants
GRANT SELECT, INSERT, UPDATE ON public.client_site_files TO authenticated;
GRANT ALL ON public.client_site_files TO service_role;

-- 3) Indexes
CREATE INDEX idx_client_site_files_site ON public.client_site_files(site_id);
CREATE INDEX idx_client_site_files_owner ON public.client_site_files(owner_user_id);
CREATE INDEX idx_client_site_files_site_archived ON public.client_site_files(site_id, is_archived);
CREATE INDEX idx_client_site_files_created ON public.client_site_files(created_at DESC);

-- 4) RLS
ALTER TABLE public.client_site_files ENABLE ROW LEVEL SECURITY;

-- Helper inline: site ownership check
-- Read policy: owner of file, or site owner/client_user, or admin
CREATE POLICY "csf_select_owner_or_site_member"
ON public.client_site_files FOR SELECT
TO authenticated
USING (
  owner_user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.client_sites s
    WHERE s.id = client_site_files.site_id
      AND (s.owner_user_id = auth.uid() OR s.client_user_id = auth.uid() OR s.created_by = auth.uid())
  )
  OR public.has_role(auth.uid(), 'admin'::public.app_role)
);

-- Insert policy: owner must be self AND must own/claim the site
CREATE POLICY "csf_insert_owner_of_site"
ON public.client_site_files FOR INSERT
TO authenticated
WITH CHECK (
  owner_user_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.client_sites s
    WHERE s.id = site_id
      AND (s.owner_user_id = auth.uid() OR s.client_user_id = auth.uid() OR s.created_by = auth.uid())
  )
);

-- Update policy: only file owner or site owner; immutable cols enforced by trigger
CREATE POLICY "csf_update_owner_or_site_owner"
ON public.client_site_files FOR UPDATE
TO authenticated
USING (
  owner_user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.client_sites s
    WHERE s.id = client_site_files.site_id
      AND (s.owner_user_id = auth.uid() OR s.client_user_id = auth.uid())
  )
)
WITH CHECK (
  owner_user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.client_sites s
    WHERE s.id = client_site_files.site_id
      AND (s.owner_user_id = auth.uid() OR s.client_user_id = auth.uid())
  )
);

-- 5) Immutability trigger
CREATE OR REPLACE FUNCTION public.client_site_files_enforce_immutable()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.site_id IS DISTINCT FROM OLD.site_id THEN
    RAISE EXCEPTION 'site_id is immutable on client_site_files';
  END IF;
  IF NEW.owner_user_id IS DISTINCT FROM OLD.owner_user_id THEN
    RAISE EXCEPTION 'owner_user_id is immutable on client_site_files';
  END IF;
  IF NEW.storage_path IS DISTINCT FROM OLD.storage_path THEN
    RAISE EXCEPTION 'storage_path is immutable on client_site_files';
  END IF;
  IF NEW.storage_bucket IS DISTINCT FROM OLD.storage_bucket THEN
    RAISE EXCEPTION 'storage_bucket is immutable on client_site_files';
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_client_site_files_immutable
BEFORE UPDATE ON public.client_site_files
FOR EACH ROW EXECUTE FUNCTION public.client_site_files_enforce_immutable();

-- 6) Storage RLS policies on the `site-files` bucket
-- Path convention: users/{auth.uid()}/sites/{site_id}/{file_id}/{file_name}

CREATE POLICY "site_files_read_own_prefix"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'site-files'
  AND (storage.foldername(name))[1] = 'users'
  AND (storage.foldername(name))[2] = auth.uid()::text
);

CREATE POLICY "site_files_insert_own_prefix"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'site-files'
  AND (storage.foldername(name))[1] = 'users'
  AND (storage.foldername(name))[2] = auth.uid()::text
);

CREATE POLICY "site_files_update_own_prefix"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'site-files'
  AND (storage.foldername(name))[1] = 'users'
  AND (storage.foldername(name))[2] = auth.uid()::text
);
