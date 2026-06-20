
-- 1. Remove unguarded permissive INSERT policies that nullify the guarded ones
DROP POLICY IF EXISTS "Anyone can record badge clicks" ON public.badge_clicks;
DROP POLICY IF EXISTS "Anyone can record badge impressions" ON public.badge_impressions;

-- 2. Admin write policies for admin_client_site_operations_notes
CREATE POLICY "acson_admin_insert"
ON public.admin_client_site_operations_notes
FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "acson_admin_update"
ON public.admin_client_site_operations_notes
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "acson_admin_delete"
ON public.admin_client_site_operations_notes
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

-- 3. UPDATE policy for contract-attachments bucket
CREATE POLICY "Contract parties can update their attachments"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'contract-attachments'
  AND EXISTS (
    SELECT 1 FROM public.contracts c
    WHERE c.id::text = (storage.foldername(objects.name))[1]
      AND (c.client_id = auth.uid() OR c.provider_id = auth.uid())
  )
)
WITH CHECK (
  bucket_id = 'contract-attachments'
  AND EXISTS (
    SELECT 1 FROM public.contracts c
    WHERE c.id::text = (storage.foldername(objects.name))[1]
      AND (c.client_id = auth.uid() OR c.provider_id = auth.uid())
  )
);

-- 4. UPDATE policy for work-order-files bucket
CREATE POLICY "wo_files_update_manager"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'work-order-files'
  AND is_business_owner_or_manager(
    auth.uid(),
    NULLIF((string_to_array(objects.name, '/'))[1], '')::uuid
  )
)
WITH CHECK (
  bucket_id = 'work-order-files'
  AND is_business_owner_or_manager(
    auth.uid(),
    NULLIF((string_to_array(objects.name, '/'))[1], '')::uuid
  )
);
