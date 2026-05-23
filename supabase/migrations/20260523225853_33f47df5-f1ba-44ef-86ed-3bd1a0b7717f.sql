-- R4F-6: Schedule membership-lifecycle-dispatcher edge function
-- Runs daily at 02:30 UTC, after process-expired-memberships (23:00),
-- process-renewal-failures (23:15), and notify-expiring-memberships (06:00).
-- Uses the vault-stored service_role key (same pattern as process-email-queue)
-- to satisfy the dispatcher's service-role-bearer auth path.

-- Ensure required extensions are present (no-op if already installed).
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Idempotently remove any prior schedule with the same job name.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'membership-lifecycle-dispatcher') THEN
    PERFORM cron.unschedule('membership-lifecycle-dispatcher');
  END IF;
END
$$;

SELECT cron.schedule(
  'membership-lifecycle-dispatcher',
  '30 2 * * *',
  $cron$
  SELECT net.http_post(
    url := 'https://hckpxwhjycmdflaneihd.supabase.co/functions/v1/membership-lifecycle-dispatcher',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (
        SELECT decrypted_secret FROM vault.decrypted_secrets
        WHERE name = 'email_queue_service_role_key'
      )
    ),
    body := '{}'::jsonb
  ) AS request_id;
  $cron$
);