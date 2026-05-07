
-- Restrict SELECT (list/metadata) on the four public buckets to authenticated users only.
-- Public direct reads via /object/public/* continue to work because public buckets bypass RLS for that endpoint.

DROP POLICY IF EXISTS "Public read access for blog images" ON storage.objects;
CREATE POLICY "Authenticated can read blog images metadata"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'blog-images');

DROP POLICY IF EXISTS "Public read access for business assets" ON storage.objects;
CREATE POLICY "Authenticated can read business assets metadata"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'business-assets');

DROP POLICY IF EXISTS "Public read access for portfolio images" ON storage.objects;
CREATE POLICY "Authenticated can read portfolio images metadata"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'portfolio-images');

DROP POLICY IF EXISTS "Public read access for project images" ON storage.objects;
CREATE POLICY "Authenticated can read project images metadata"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'project-images');
