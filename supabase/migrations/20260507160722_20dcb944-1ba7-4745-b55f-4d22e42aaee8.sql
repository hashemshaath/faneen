
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

DO $$
DECLARE _jobid int;
BEGIN
  SELECT jobid INTO _jobid FROM cron.job WHERE jobname = 'audit-sitemap-status-daily';
  IF _jobid IS NOT NULL THEN PERFORM cron.unschedule(_jobid); END IF;
END $$;

SELECT cron.schedule(
  'audit-sitemap-status-daily',
  '0 3 * * *',
  $$
  SELECT net.http_post(
    url := 'https://hckpxwhjycmdflaneihd.supabase.co/functions/v1/audit-sitemap-status',
    headers := '{"Content-Type":"application/json","apikey":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhja3B4d2hqeWNtZGZsYW5laWhkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU3NDgxMDgsImV4cCI6MjA5MTMyNDEwOH0.YDxBd4rKzjvD3OA6nKMu48Am2wbIlG3pqFIZgKLI2CQ"}'::jsonb,
    body := '{"triggeredBy":"cron"}'::jsonb
  ) AS request_id;
  $$
);
