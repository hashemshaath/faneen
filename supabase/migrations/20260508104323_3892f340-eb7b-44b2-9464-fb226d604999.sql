-- Drop broad authenticated metadata SELECT policies
DROP POLICY IF EXISTS "Authenticated can read business assets metadata" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated can read portfolio images metadata" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated can read project images metadata"   ON storage.objects;
DROP POLICY IF EXISTS "Authenticated can read blog images metadata"      ON storage.objects;

-- Recreate as owner-folder-only with admin exception
CREATE POLICY "Owner or admin can list business assets"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'business-assets'
  AND (
    (storage.foldername(name))[1] = (auth.uid())::text
    OR public.has_admin_access(auth.uid())
  )
);

CREATE POLICY "Owner or admin can list portfolio images"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'portfolio-images'
  AND (
    (storage.foldername(name))[1] = (auth.uid())::text
    OR public.has_admin_access(auth.uid())
  )
);

CREATE POLICY "Owner or admin can list project images"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'project-images'
  AND (
    (storage.foldername(name))[1] = (auth.uid())::text
    OR public.has_admin_access(auth.uid())
  )
);

CREATE POLICY "Owner or admin can list blog images"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'blog-images'
  AND (
    (storage.foldername(name))[1] = (auth.uid())::text
    OR public.has_admin_access(auth.uid())
  )
);