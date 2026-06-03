DO $$
DECLARE
  legacy_job RECORD;
BEGIN
  FOR legacy_job IN
    SELECT jobid
    FROM cron.job
    WHERE command ILIKE '%process-email-queue%'
       OR command ILIKE '%auth_emails%'
       OR command ILIKE '%transactional_emails%'
  LOOP
    PERFORM cron.unschedule(legacy_job.jobid);
  END LOOP;
END $$;