-- 1) Cover + gallery on client_sites
ALTER TABLE public.client_sites
  ADD COLUMN IF NOT EXISTS cover_image_url text,
  ADD COLUMN IF NOT EXISTS gallery_images jsonb NOT NULL DEFAULT '[]'::jsonb;

-- 2) Link RFQ to site
ALTER TABLE public.rfq_requests
  ADD COLUMN IF NOT EXISTS site_id uuid REFERENCES public.client_sites(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_rfq_requests_site_id ON public.rfq_requests(site_id);

-- 3) Storage policies on client-site-images
-- Path convention: {site_id}/cover/... or {site_id}/gallery/...
-- Helper: derive site_id from object name (first folder segment)
CREATE OR REPLACE FUNCTION public.csi_object_site_id(_name text)
RETURNS uuid
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT NULLIF(split_part(_name, '/', 1), '')::uuid
$$;

CREATE OR REPLACE FUNCTION public.csi_user_can_manage_site(_site_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.client_sites cs
    WHERE cs.id = _site_id
      AND (
        cs.owner_user_id = auth.uid()
        OR cs.client_user_id = auth.uid()
        OR cs.created_by = auth.uid()
      )
  )
$$;

DROP POLICY IF EXISTS "csi_select_owner" ON storage.objects;
CREATE POLICY "csi_select_owner" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'client-site-images'
    AND public.csi_user_can_manage_site(public.csi_object_site_id(name))
  );

DROP POLICY IF EXISTS "csi_insert_owner" ON storage.objects;
CREATE POLICY "csi_insert_owner" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'client-site-images'
    AND public.csi_user_can_manage_site(public.csi_object_site_id(name))
  );

DROP POLICY IF EXISTS "csi_update_owner" ON storage.objects;
CREATE POLICY "csi_update_owner" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'client-site-images'
    AND public.csi_user_can_manage_site(public.csi_object_site_id(name))
  );

DROP POLICY IF EXISTS "csi_delete_owner" ON storage.objects;
CREATE POLICY "csi_delete_owner" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'client-site-images'
    AND public.csi_user_can_manage_site(public.csi_object_site_id(name))
  );