
-- Require uploader to own a business when uploading to business-related buckets
DROP POLICY IF EXISTS "Users can upload business assets" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload portfolio images" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload project images" ON storage.objects;

CREATE POLICY "Users can upload business assets"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'business-assets'
  AND (storage.foldername(name))[1] = auth.uid()::text
  AND EXISTS (SELECT 1 FROM public.businesses b WHERE b.user_id = auth.uid())
);

CREATE POLICY "Users can upload portfolio images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'portfolio-images'
  AND (storage.foldername(name))[1] = auth.uid()::text
  AND EXISTS (SELECT 1 FROM public.businesses b WHERE b.user_id = auth.uid())
);

CREATE POLICY "Users can upload project images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'project-images'
  AND (storage.foldername(name))[1] = auth.uid()::text
  AND EXISTS (SELECT 1 FROM public.businesses b WHERE b.user_id = auth.uid())
);
