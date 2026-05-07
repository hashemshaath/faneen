
-- 1) Alerts table
CREATE TABLE IF NOT EXISTS public.email_deliverability_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_type TEXT NOT NULL, -- 'high_failure_rate' | 'high_bounce_rate' | 'high_complaint_rate' | 'queue_stalled'
  severity TEXT NOT NULL DEFAULT 'warning', -- 'info' | 'warning' | 'critical'
  window_minutes INT NOT NULL,
  total_emails INT NOT NULL,
  failed_count INT NOT NULL DEFAULT 0,
  bounced_count INT NOT NULL DEFAULT 0,
  complained_count INT NOT NULL DEFAULT 0,
  rate NUMERIC(5,2) NOT NULL,
  threshold NUMERIC(5,2) NOT NULL,
  message TEXT,
  acknowledged BOOLEAN NOT NULL DEFAULT false,
  acknowledged_by UUID,
  acknowledged_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_email_alerts_created_at ON public.email_deliverability_alerts (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_alerts_ack ON public.email_deliverability_alerts (acknowledged, created_at DESC);

ALTER TABLE public.email_deliverability_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read email alerts" ON public.email_deliverability_alerts
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Admins update email alerts" ON public.email_deliverability_alerts
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Service role inserts email alerts" ON public.email_deliverability_alerts
  FOR INSERT TO service_role
  WITH CHECK (true);

-- 2) Stats function (deduplicated by message_id)
CREATE OR REPLACE FUNCTION public.get_email_deliverability_stats(_window_minutes INT DEFAULT 60)
RETURNS TABLE (
  total BIGINT,
  sent BIGINT,
  failed BIGINT,
  bounced BIGINT,
  complained BIGINT,
  suppressed BIGINT,
  pending BIGINT,
  dlq BIGINT,
  failure_rate NUMERIC,
  bounce_rate NUMERIC,
  complaint_rate NUMERIC
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH latest AS (
    SELECT DISTINCT ON (message_id) status, created_at
    FROM public.email_send_log
    WHERE message_id IS NOT NULL
      AND created_at >= now() - (_window_minutes || ' minutes')::interval
    ORDER BY message_id, created_at DESC
  ),
  agg AS (
    SELECT
      count(*)::bigint AS total,
      count(*) FILTER (WHERE status = 'sent')::bigint AS sent,
      count(*) FILTER (WHERE status = 'failed')::bigint AS failed,
      count(*) FILTER (WHERE status = 'bounced')::bigint AS bounced,
      count(*) FILTER (WHERE status = 'complained')::bigint AS complained,
      count(*) FILTER (WHERE status = 'suppressed')::bigint AS suppressed,
      count(*) FILTER (WHERE status = 'pending')::bigint AS pending,
      count(*) FILTER (WHERE status = 'dlq')::bigint AS dlq
    FROM latest
  )
  SELECT
    total, sent, failed, bounced, complained, suppressed, pending, dlq,
    CASE WHEN total > 0 THEN round(((failed + dlq)::numeric / total) * 100, 2) ELSE 0 END AS failure_rate,
    CASE WHEN total > 0 THEN round((bounced::numeric / total) * 100, 2) ELSE 0 END AS bounce_rate,
    CASE WHEN total > 0 THEN round((complained::numeric / total) * 100, 2) ELSE 0 END AS complaint_rate
  FROM agg;
$$;

GRANT EXECUTE ON FUNCTION public.get_email_deliverability_stats(INT) TO authenticated, service_role;

-- 3) Periodic checker
CREATE OR REPLACE FUNCTION public.check_email_deliverability()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  s RECORD;
  v_min_volume CONSTANT INT := 10; -- avoid noisy alerts on tiny samples
  v_failure_threshold CONSTANT NUMERIC := 20.0; -- %
  v_bounce_threshold  CONSTANT NUMERIC := 10.0;
  v_complaint_threshold CONSTANT NUMERIC := 2.0;
  v_recent_alert_minutes CONSTANT INT := 60; -- dedupe window
BEGIN
  SELECT * INTO s FROM public.get_email_deliverability_stats(60);

  IF s.total < v_min_volume THEN
    RETURN;
  END IF;

  -- failure rate
  IF s.failure_rate >= v_failure_threshold AND NOT EXISTS (
    SELECT 1 FROM public.email_deliverability_alerts
    WHERE alert_type = 'high_failure_rate'
      AND created_at >= now() - (v_recent_alert_minutes || ' minutes')::interval
  ) THEN
    INSERT INTO public.email_deliverability_alerts(
      alert_type, severity, window_minutes, total_emails, failed_count,
      bounced_count, complained_count, rate, threshold, message
    ) VALUES (
      'high_failure_rate',
      CASE WHEN s.failure_rate >= 50 THEN 'critical' ELSE 'warning' END,
      60, s.total::int, (s.failed + s.dlq)::int, s.bounced::int, s.complained::int,
      s.failure_rate, v_failure_threshold,
      'ارتفاع معدل فشل إرسال البريد خلال آخر ساعة'
    );
  END IF;

  -- bounce rate
  IF s.bounce_rate >= v_bounce_threshold AND NOT EXISTS (
    SELECT 1 FROM public.email_deliverability_alerts
    WHERE alert_type = 'high_bounce_rate'
      AND created_at >= now() - (v_recent_alert_minutes || ' minutes')::interval
  ) THEN
    INSERT INTO public.email_deliverability_alerts(
      alert_type, severity, window_minutes, total_emails, failed_count,
      bounced_count, complained_count, rate, threshold, message
    ) VALUES (
      'high_bounce_rate',
      CASE WHEN s.bounce_rate >= 25 THEN 'critical' ELSE 'warning' END,
      60, s.total::int, (s.failed + s.dlq)::int, s.bounced::int, s.complained::int,
      s.bounce_rate, v_bounce_threshold,
      'ارتفاع معدل ارتداد البريد خلال آخر ساعة'
    );
  END IF;

  -- complaint rate
  IF s.complaint_rate >= v_complaint_threshold AND NOT EXISTS (
    SELECT 1 FROM public.email_deliverability_alerts
    WHERE alert_type = 'high_complaint_rate'
      AND created_at >= now() - (v_recent_alert_minutes || ' minutes')::interval
  ) THEN
    INSERT INTO public.email_deliverability_alerts(
      alert_type, severity, window_minutes, total_emails, failed_count,
      bounced_count, complained_count, rate, threshold, message
    ) VALUES (
      'high_complaint_rate',
      'critical',
      60, s.total::int, (s.failed + s.dlq)::int, s.bounced::int, s.complained::int,
      s.complaint_rate, v_complaint_threshold,
      'ارتفاع معدل شكاوى البريد (Spam complaints) خلال آخر ساعة'
    );
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.check_email_deliverability() TO service_role;

-- 4) Schedule via pg_cron every 15 minutes
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.unschedule(jobid)
    FROM cron.job WHERE jobname = 'check-email-deliverability';

    PERFORM cron.schedule(
      'check-email-deliverability',
      '*/15 * * * *',
      $cron$ SELECT public.check_email_deliverability(); $cron$
    );
  END IF;
END $$;
