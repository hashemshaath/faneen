-- Ensure required extensions
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Remove existing job if present (idempotent)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'daily-site-audit') THEN
    PERFORM cron.unschedule('daily-site-audit');
  END IF;
END$$;

-- Schedule daily audit at 03:00 UTC
SELECT cron.schedule(
  'daily-site-audit',
  '0 3 * * *',
  $$
  SELECT net.http_post(
    url := 'https://hckpxwhjycmdflaneihd.supabase.co/functions/v1/run-site-audit',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhja3B4d2hqeWNtZGZsYW5laWhkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU3NDgxMDgsImV4cCI6MjA5MTMyNDEwOH0.YDxBd4rKzjvD3OA6nKMu48Am2wbIlG3pqFIZgKLI2CQ'
    ),
    body := jsonb_build_object('source', 'cron', 'time', now())
  ) AS request_id;
  $$
);