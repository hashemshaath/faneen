
CREATE OR REPLACE FUNCTION public.detect_delayed_auth_emails(p_threshold_minutes integer DEFAULT 5)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_inserted integer := 0; v_row record;
BEGIN
  FOR v_row IN
    WITH latest AS (
      SELECT DISTINCT ON (message_id) message_id, template_name, recipient_email, status, error_message, created_at
      FROM email_send_log
      WHERE template_name IN ('signup','recovery','magiclink','invite','email_change','reauthentication')
        AND created_at > now() - interval '6 hours' AND message_id IS NOT NULL
      ORDER BY message_id, created_at DESC
    )
    SELECT * FROM latest
    WHERE status IN ('pending','failed','dlq')
      AND created_at < now() - (p_threshold_minutes || ' minutes')::interval
  LOOP
    IF EXISTS (SELECT 1 FROM email_deliverability_alerts
      WHERE alert_type='auth_email_delayed' AND acknowledged=false
        AND metadata->>'message_id' = v_row.message_id) THEN CONTINUE; END IF;
    INSERT INTO email_deliverability_alerts(alert_type, severity, window_minutes, total_emails,
      failed_count, bounced_count, complained_count, rate, threshold, message, metadata)
    VALUES ('auth_email_delayed',
      CASE WHEN v_row.status='dlq' THEN 'critical' ELSE 'warning' END,
      p_threshold_minutes, 1,
      CASE WHEN v_row.status IN ('failed','dlq') THEN 1 ELSE 0 END, 0, 0,
      100.0, p_threshold_minutes,
      format('Auth email %s (%s) stuck in status=%s for >%s min',
        v_row.template_name, v_row.recipient_email, v_row.status, p_threshold_minutes),
      jsonb_build_object('message_id', v_row.message_id, 'template_name', v_row.template_name,
        'recipient_email', v_row.recipient_email, 'status', v_row.status,
        'error_message', v_row.error_message, 'first_seen_at', v_row.created_at));
    v_inserted := v_inserted + 1;
  END LOOP;
  RETURN v_inserted;
END; $$;
REVOKE ALL ON FUNCTION public.detect_delayed_auth_emails(integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.detect_delayed_auth_emails(integer) TO service_role;

CREATE OR REPLACE FUNCTION public.get_recent_auth_email_attempts(p_limit integer DEFAULT 50, p_hours integer DEFAULT 24)
RETURNS TABLE(message_id text, template_name text, recipient_email text, latest_status text,
  error_message text, provider text, provider_id text, enqueued_at timestamptz, sent_at timestamptz,
  delivery_seconds numeric, attempts integer)
LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE AS $$
  WITH base AS (
    SELECT * FROM email_send_log
    WHERE template_name IN ('signup','recovery','magiclink','invite','email_change','reauthentication')
      AND created_at > now() - (p_hours || ' hours')::interval AND message_id IS NOT NULL
      AND (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'super_admin'::app_role))
  ), agg AS (
    SELECT message_id, MAX(template_name) AS template_name, MAX(recipient_email) AS recipient_email,
      MIN(created_at) AS enqueued_at, MAX(CASE WHEN status='sent' THEN created_at END) AS sent_at,
      COUNT(*)::int AS attempts FROM base GROUP BY message_id
  ), latest AS (
    SELECT DISTINCT ON (message_id) message_id, status, error_message, metadata
    FROM base ORDER BY message_id, created_at DESC
  )
  SELECT a.message_id, a.template_name, a.recipient_email, l.status, l.error_message,
    l.metadata->>'provider', l.metadata->>'provider_id', a.enqueued_at, a.sent_at,
    CASE WHEN a.sent_at IS NOT NULL THEN EXTRACT(EPOCH FROM (a.sent_at - a.enqueued_at))::numeric(10,2) END,
    a.attempts
  FROM agg a JOIN latest l USING (message_id)
  ORDER BY a.enqueued_at DESC LIMIT p_limit;
$$;
REVOKE ALL ON FUNCTION public.get_recent_auth_email_attempts(integer, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_recent_auth_email_attempts(integer, integer) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_auth_email_timing_report(p_hours integer DEFAULT 24)
RETURNS TABLE(bucket_hour timestamptz, enqueued_count integer, sent_count integer,
  failed_count integer, median_delivery_seconds numeric, p95_delivery_seconds numeric)
LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE AS $$
  WITH base AS (
    SELECT * FROM email_send_log
    WHERE template_name IN ('signup','recovery','magiclink','invite','email_change','reauthentication')
      AND created_at > now() - (p_hours || ' hours')::interval AND message_id IS NOT NULL
      AND (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'super_admin'::app_role))
  ), per_msg AS (
    SELECT message_id, MIN(created_at) AS enqueued_at,
      MAX(CASE WHEN status='sent' THEN created_at END) AS sent_at,
      bool_or(status IN ('failed','dlq')) AS had_failure
    FROM base GROUP BY message_id
  ), buckets AS (
    SELECT generate_series(date_trunc('hour', now() - (p_hours||' hours')::interval),
      date_trunc('hour', now()), interval '1 hour') AS bucket_hour
  )
  SELECT b.bucket_hour,
    COUNT(p.*) FILTER (WHERE date_trunc('hour', p.enqueued_at)=b.bucket_hour)::int,
    COUNT(p.*) FILTER (WHERE date_trunc('hour', p.sent_at)=b.bucket_hour)::int,
    COUNT(p.*) FILTER (WHERE date_trunc('hour', p.enqueued_at)=b.bucket_hour AND p.had_failure)::int,
    percentile_cont(0.5) WITHIN GROUP (ORDER BY EXTRACT(EPOCH FROM (p.sent_at - p.enqueued_at)))
      FILTER (WHERE date_trunc('hour', p.enqueued_at)=b.bucket_hour AND p.sent_at IS NOT NULL)::numeric(10,2),
    percentile_cont(0.95) WITHIN GROUP (ORDER BY EXTRACT(EPOCH FROM (p.sent_at - p.enqueued_at)))
      FILTER (WHERE date_trunc('hour', p.enqueued_at)=b.bucket_hour AND p.sent_at IS NOT NULL)::numeric(10,2)
  FROM buckets b LEFT JOIN per_msg p ON true
  GROUP BY b.bucket_hour ORDER BY b.bucket_hour;
$$;
REVOKE ALL ON FUNCTION public.get_auth_email_timing_report(integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_auth_email_timing_report(integer) TO authenticated;

DO $$ BEGIN PERFORM cron.unschedule('email-delayed-auth-detector');
EXCEPTION WHEN OTHERS THEN NULL; END $$;

SELECT cron.schedule('email-delayed-auth-detector', '*/5 * * * *',
  $job$SELECT public.detect_delayed_auth_emails(5);$job$);
