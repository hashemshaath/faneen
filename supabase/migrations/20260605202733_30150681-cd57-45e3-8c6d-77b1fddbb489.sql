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
      AND w.status NOT IN ('completed','cancelled')
  )
);