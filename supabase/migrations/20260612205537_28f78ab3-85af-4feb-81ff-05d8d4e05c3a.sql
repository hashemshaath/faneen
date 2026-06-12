
-- Harden rental-images storage policies: require uploader actually owns a business,
-- in addition to the per-user folder prefix check.

DROP POLICY IF EXISTS rental_images_owner_insert ON storage.objects;
DROP POLICY IF EXISTS rental_images_owner_update ON storage.objects;
DROP POLICY IF EXISTS rental_images_owner_delete ON storage.objects;

CREATE POLICY rental_images_owner_insert ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'rental-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
    AND EXISTS (SELECT 1 FROM public.businesses b WHERE b.user_id = auth.uid())
  );

CREATE POLICY rental_images_owner_update ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'rental-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
    AND EXISTS (SELECT 1 FROM public.businesses b WHERE b.user_id = auth.uid())
  )
  WITH CHECK (
    bucket_id = 'rental-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
    AND EXISTS (SELECT 1 FROM public.businesses b WHERE b.user_id = auth.uid())
  );

CREATE POLICY rental_images_owner_delete ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'rental-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
    AND EXISTS (SELECT 1 FROM public.businesses b WHERE b.user_id = auth.uid())
  );
