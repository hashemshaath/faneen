
-- Owner INSERT
CREATE POLICY "business-documents owner insert"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'business-documents'
  AND EXISTS (
    SELECT 1 FROM public.businesses b
    WHERE b.user_id = auth.uid()
      AND (storage.foldername(name))[2] = b.id::text
  )
);

-- Owner UPDATE
CREATE POLICY "business-documents owner update"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'business-documents'
  AND EXISTS (
    SELECT 1 FROM public.businesses b
    WHERE b.user_id = auth.uid()
      AND (storage.foldername(name))[2] = b.id::text
  )
)
WITH CHECK (
  bucket_id = 'business-documents'
  AND EXISTS (
    SELECT 1 FROM public.businesses b
    WHERE b.user_id = auth.uid()
      AND (storage.foldername(name))[2] = b.id::text
  )
);

-- Owner DELETE
CREATE POLICY "business-documents owner delete"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'business-documents'
  AND EXISTS (
    SELECT 1 FROM public.businesses b
    WHERE b.user_id = auth.uid()
      AND (storage.foldername(name))[2] = b.id::text
  )
);
