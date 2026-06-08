-- Allow individual users (no business) to upload files into their own
-- folder in `business-assets`. The previous INSERT policy required
-- `EXISTS (SELECT 1 FROM businesses WHERE user_id = auth.uid())`, which
-- blocked individuals using personal-mode features (site covers,
-- site galleries, etc.) and caused
-- "new row violates row-level security policy" on every upload.
-- Owner-folder enforcement (`foldername[1] = auth.uid()`) is sufficient
-- and matches the pattern used by every other user-owned bucket
-- (portfolio-images, project-images, blog-images, …).

DROP POLICY IF EXISTS "Users can upload business assets" ON storage.objects;

CREATE POLICY "Users can upload business assets"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'business-assets'
  AND (storage.foldername(name))[1] = (auth.uid())::text
);