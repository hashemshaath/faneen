-- Owner-scoped policies for the rental-images storage bucket
CREATE POLICY "rental_images_owner_select" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'rental-images' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "rental_images_owner_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'rental-images' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "rental_images_owner_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'rental-images' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "rental_images_owner_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'rental-images' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "rental_images_admin_all" ON storage.objects
  FOR ALL TO authenticated
  USING (bucket_id = 'rental-images' AND public.has_admin_access(auth.uid()))
  WITH CHECK (bucket_id = 'rental-images' AND public.has_admin_access(auth.uid()));