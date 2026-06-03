-- 1) business_profile_visibility: restrict columns exposed to anonymous users
-- Anon can still see which sections exist with what visibility, but not admin_note,
-- updated_by, locked_by_admin, timestamps, or internal ids.
REVOKE SELECT ON public.business_profile_visibility FROM anon;
GRANT SELECT (business_id, section_key, visibility_level)
  ON public.business_profile_visibility TO anon;

-- 2) Tighten work-order-files INSERT policy: validate that the work_order_id
-- in the path actually belongs to the business_id in the path.
DROP POLICY IF EXISTS "wo_files_insert_manager" ON storage.objects;

CREATE POLICY "wo_files_insert_manager"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'work-order-files'
  AND owner = auth.uid()
  AND public.is_business_owner_or_manager(
    auth.uid(),
    NULLIF((string_to_array(name, '/'))[1], '')::uuid
  )
  AND EXISTS (
    SELECT 1
    FROM public.work_orders w
    WHERE w.id = NULLIF((string_to_array(name, '/'))[2], '')::uuid
      AND w.business_id = NULLIF((string_to_array(name, '/'))[1], '')::uuid
      AND w.deleted_at IS NULL
  )
);