CREATE TABLE IF NOT EXISTS public.directory_sync_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_table text NOT NULL,
  operation text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT ON public.directory_sync_events TO anon;
GRANT SELECT ON public.directory_sync_events TO authenticated;
GRANT ALL ON public.directory_sync_events TO service_role;

ALTER TABLE public.directory_sync_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can read directory sync events" ON public.directory_sync_events;
CREATE POLICY "Public can read directory sync events"
ON public.directory_sync_events
FOR SELECT
TO anon, authenticated
USING (true);

CREATE OR REPLACE FUNCTION public.emit_directory_sync_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.directory_sync_events (source_table, operation)
  VALUES (TG_TABLE_NAME, TG_OP);

  DELETE FROM public.directory_sync_events
  WHERE created_at < now() - interval '1 day';

  RETURN NULL;
END;
$$;

DO $$
DECLARE
  table_name text;
  trigger_name text;
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
    trigger_name := 'trg_directory_sync_' || table_name;
    EXECUTE format('DROP TRIGGER IF EXISTS %I ON public.%I', trigger_name, table_name);
    EXECUTE format(
      'CREATE TRIGGER %I AFTER INSERT OR UPDATE OR DELETE ON public.%I FOR EACH STATEMENT EXECUTE FUNCTION public.emit_directory_sync_event()',
      trigger_name,
      table_name
    );
  END LOOP;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'directory_sync_events'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.directory_sync_events;
  END IF;
END $$;