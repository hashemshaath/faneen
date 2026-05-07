
ALTER TABLE public.email_send_log REPLICA IDENTITY FULL;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='email_send_log'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.email_send_log;
  END IF;
END $$;

ALTER TABLE public.email_deliverability_alerts REPLICA IDENTITY FULL;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='email_deliverability_alerts'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.email_deliverability_alerts;
  END IF;
END $$;
