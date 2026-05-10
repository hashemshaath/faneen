
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- 1) Weekly SLA report cron (Mondays 09:00 UTC)
DO $$
DECLARE _jobid int;
BEGIN
  SELECT jobid INTO _jobid FROM cron.job WHERE jobname = 'weekly-sla-report';
  IF _jobid IS NOT NULL THEN PERFORM cron.unschedule(_jobid); END IF;
END $$;

SELECT cron.schedule(
  'weekly-sla-report',
  '0 9 * * 1',
  $$
  SELECT net.http_post(
    url := 'https://hckpxwhjycmdflaneihd.supabase.co/functions/v1/weekly-sla-report',
    headers := '{"Content-Type":"application/json","apikey":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhja3B4d2hqeWNtZGZsYW5laWhkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU3NDgxMDgsImV4cCI6MjA5MTMyNDEwOH0.YDxBd4rKzjvD3OA6nKMu48Am2wbIlG3pqFIZgKLI2CQ"}'::jsonb,
    body := '{"triggeredBy":"cron"}'::jsonb
  ) AS request_id;
  $$
);

-- 2) Trigger: fire notify-contact-event on each new event row
CREATE OR REPLACE FUNCTION public.fire_contact_event_notification()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.event_type IN ('assignee_changed','status_changed','priority_changed','ai_triaged') THEN
    PERFORM net.http_post(
      url := 'https://hckpxwhjycmdflaneihd.supabase.co/functions/v1/notify-contact-event',
      headers := '{"Content-Type":"application/json","apikey":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhja3B4d2hqeWNtZGZsYW5laWhkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU3NDgxMDgsImV4cCI6MjA5MTMyNDEwOH0.YDxBd4rKzjvD3OA6nKMu48Am2wbIlG3pqFIZgKLI2CQ"}'::jsonb,
      body := jsonb_build_object(
        'event_id', NEW.id,
        'message_id', NEW.message_id,
        'event_type', NEW.event_type,
        'from_value', NEW.from_value,
        'to_value', NEW.to_value,
        'actor_id', NEW.actor_id
      )
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_fire_contact_event_notification ON public.contact_message_events;
CREATE TRIGGER trg_fire_contact_event_notification
  AFTER INSERT ON public.contact_message_events
  FOR EACH ROW EXECUTE FUNCTION public.fire_contact_event_notification();
