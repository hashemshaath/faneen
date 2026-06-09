DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'business_taxonomy_categories'
      AND policyname = 'Public can read links for visible businesses'
  ) THEN
    CREATE POLICY "Public can read links for visible businesses"
    ON public.business_taxonomy_categories
    FOR SELECT
    TO anon, authenticated
    USING (
      EXISTS (
        SELECT 1
        FROM public.businesses b
        WHERE b.id = business_taxonomy_categories.business_id
          AND b.is_active = true
          AND b.approval_status = 'published'::public.business_approval_status
          AND b.is_demo = false
      )
    );
  END IF;
END $$;

DO $$
DECLARE
  table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'businesses',
    'business_taxonomy_categories',
    'business_service_taxonomy_categories',
    'taxonomy_categories',
    'cities',
    'business_services',
    'promotions'
  ]
  LOOP
    IF NOT EXISTS (
      SELECT 1
      FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime'
        AND schemaname = 'public'
        AND tablename = table_name
    ) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', table_name);
    END IF;
  END LOOP;
END $$;