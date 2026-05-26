-- Allow admins to fully manage public image buckets, regardless of folder owner.
-- Needed so admins editing businesses in /admin/businesses can upload/replace/delete
-- logos, covers, portfolio and project images on behalf of any business owner.

DO $$
DECLARE
  b text;
  buckets text[] := ARRAY['business-assets','portfolio-images','project-images','blog-images','showcase','brand-assets'];
BEGIN
  FOREACH b IN ARRAY buckets LOOP
    -- INSERT
    EXECUTE format($f$
      DROP POLICY IF EXISTS %I ON storage.objects;
      CREATE POLICY %I ON storage.objects
        FOR INSERT TO authenticated
        WITH CHECK (bucket_id = %L AND public.has_admin_access(auth.uid()));
    $f$, 'Admins can upload to '||b, 'Admins can upload to '||b, b);

    -- UPDATE
    EXECUTE format($f$
      DROP POLICY IF EXISTS %I ON storage.objects;
      CREATE POLICY %I ON storage.objects
        FOR UPDATE TO authenticated
        USING (bucket_id = %L AND public.has_admin_access(auth.uid()))
        WITH CHECK (bucket_id = %L AND public.has_admin_access(auth.uid()));
    $f$, 'Admins can update in '||b, 'Admins can update in '||b, b, b);

    -- DELETE
    EXECUTE format($f$
      DROP POLICY IF EXISTS %I ON storage.objects;
      CREATE POLICY %I ON storage.objects
        FOR DELETE TO authenticated
        USING (bucket_id = %L AND public.has_admin_access(auth.uid()));
    $f$, 'Admins can delete in '||b, 'Admins can delete in '||b, b);
  END LOOP;
END $$;