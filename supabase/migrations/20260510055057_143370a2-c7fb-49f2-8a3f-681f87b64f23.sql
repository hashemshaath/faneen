
-- 1. Notification delivery log
CREATE TABLE IF NOT EXISTS public.contact_notification_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid REFERENCES public.contact_message_events(id) ON DELETE SET NULL,
  message_id uuid REFERENCES public.contact_messages(id) ON DELETE CASCADE,
  event_type text,
  channel text NOT NULL CHECK (channel IN ('email','webhook')),
  recipient text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','success','failed','max_retries','skipped')),
  attempt_count int NOT NULL DEFAULT 0,
  max_attempts int NOT NULL DEFAULT 5,
  http_status int,
  error_code text,
  error_message text,
  request_payload jsonb,
  response_body text,
  next_retry_at timestamptz,
  last_attempt_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_cnl_status_next ON public.contact_notification_log (status, next_retry_at) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_cnl_message ON public.contact_notification_log (message_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cnl_created ON public.contact_notification_log (created_at DESC);

ALTER TABLE public.contact_notification_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins read notif log" ON public.contact_notification_log;
CREATE POLICY "Admins read notif log" ON public.contact_notification_log
  FOR SELECT TO authenticated USING (public.has_admin_access(auth.uid()));

-- updated_at trigger
DROP TRIGGER IF EXISTS trg_cnl_updated_at ON public.contact_notification_log;
CREATE TRIGGER trg_cnl_updated_at BEFORE UPDATE ON public.contact_notification_log
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. Add retry settings to inbox settings
ALTER TABLE public.contact_inbox_settings
  ADD COLUMN IF NOT EXISTS max_notification_attempts int NOT NULL DEFAULT 5,
  ADD COLUMN IF NOT EXISTS retry_backoff_seconds int NOT NULL DEFAULT 60,
  ADD COLUMN IF NOT EXISTS alert_on_max_retries boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS alert_recipients text[] NOT NULL DEFAULT '{}'::text[];

-- Patch update RPC to support these new fields
CREATE OR REPLACE FUNCTION public.update_contact_inbox_settings(_patch jsonb)
RETURNS public.contact_inbox_settings LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _row public.contact_inbox_settings;
BEGIN
  IF NOT public.has_admin_access(auth.uid()) THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;
  UPDATE public.contact_inbox_settings SET
    stale_hours                       = COALESCE((_patch->>'stale_hours')::int, stale_hours),
    target_response_hours             = COALESCE((_patch->>'target_response_hours')::int, target_response_hours),
    target_resolution_hours           = COALESCE((_patch->>'target_resolution_hours')::int, target_resolution_hours),
    notify_email_on_assign            = COALESCE((_patch->>'notify_email_on_assign')::boolean, notify_email_on_assign),
    notify_email_on_status_change     = COALESCE((_patch->>'notify_email_on_status_change')::boolean, notify_email_on_status_change),
    notify_email_on_priority_change   = COALESCE((_patch->>'notify_email_on_priority_change')::boolean, notify_email_on_priority_change),
    notify_webhook_on_assign          = COALESCE((_patch->>'notify_webhook_on_assign')::boolean, notify_webhook_on_assign),
    notify_webhook_on_status_change   = COALESCE((_patch->>'notify_webhook_on_status_change')::boolean, notify_webhook_on_status_change),
    notify_webhook_on_priority_change = COALESCE((_patch->>'notify_webhook_on_priority_change')::boolean, notify_webhook_on_priority_change),
    webhook_url                       = CASE WHEN _patch ? 'webhook_url' THEN NULLIF(_patch->>'webhook_url','') ELSE webhook_url END,
    webhook_secret                    = CASE WHEN _patch ? 'webhook_secret' THEN NULLIF(_patch->>'webhook_secret','') ELSE webhook_secret END,
    role_subscriptions                = CASE WHEN _patch ? 'role_subscriptions' THEN _patch->'role_subscriptions' ELSE role_subscriptions END,
    muted_user_ids                    = CASE WHEN _patch ? 'muted_user_ids'
                                              THEN ARRAY(SELECT jsonb_array_elements_text(_patch->'muted_user_ids'))::uuid[]
                                              ELSE muted_user_ids END,
    weekly_report_recipients          = CASE WHEN _patch ? 'weekly_report_recipients'
                                              THEN ARRAY(SELECT jsonb_array_elements_text(_patch->'weekly_report_recipients'))
                                              ELSE weekly_report_recipients END,
    max_notification_attempts         = COALESCE((_patch->>'max_notification_attempts')::int, max_notification_attempts),
    retry_backoff_seconds             = COALESCE((_patch->>'retry_backoff_seconds')::int, retry_backoff_seconds),
    alert_on_max_retries              = COALESCE((_patch->>'alert_on_max_retries')::boolean, alert_on_max_retries),
    alert_recipients                  = CASE WHEN _patch ? 'alert_recipients'
                                              THEN ARRAY(SELECT jsonb_array_elements_text(_patch->'alert_recipients'))
                                              ELSE alert_recipients END,
    updated_at = now(),
    updated_by = auth.uid()
  WHERE id = 1
  RETURNING * INTO _row;
  RETURN _row;
END $$;

-- 3. SLA compliance RPC with date range and group_by (category|assignee|overall)
CREATE OR REPLACE FUNCTION public.get_contact_sla_compliance(
  _from timestamptz DEFAULT now() - interval '30 days',
  _to   timestamptz DEFAULT now(),
  _group_by text DEFAULT 'overall'  -- overall | category | assignee | day | week
) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _settings public.contact_inbox_settings;
  _result jsonb;
  _overall jsonb;
  _by_category jsonb;
  _by_assignee jsonb;
  _by_day jsonb;
BEGIN
  IF NOT public.has_admin_access(auth.uid()) THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;
  SELECT * INTO _settings FROM public.contact_inbox_settings WHERE id = 1;

  WITH base AS (
    SELECT
      m.id, m.status, m.priority, m.created_at, m.replied_at, m.closed_at,
      m.assigned_to, COALESCE(NULLIF(m.ai_category,''), 'uncategorized') AS category,
      EXTRACT(EPOCH FROM (m.replied_at - m.created_at))/3600.0 AS resp_hours,
      EXTRACT(EPOCH FROM (COALESCE(m.closed_at, now()) - m.created_at))/3600.0 AS res_hours
    FROM public.contact_messages m
    WHERE m.created_at >= _from AND m.created_at <= _to
  )
  SELECT jsonb_build_object(
    'total', COUNT(*),
    'replied', COUNT(*) FILTER (WHERE replied_at IS NOT NULL),
    'closed', COUNT(*) FILTER (WHERE status = 'closed'),
    'avg_response_hours', ROUND(AVG(resp_hours)::numeric, 2),
    'avg_resolution_hours', ROUND(AVG(res_hours) FILTER (WHERE status = 'closed')::numeric, 2),
    'sla_response_compliance_pct', ROUND(
      (COUNT(*) FILTER (WHERE replied_at IS NOT NULL AND resp_hours <= _settings.target_response_hours)::numeric
       / NULLIF(COUNT(*) FILTER (WHERE replied_at IS NOT NULL), 0)) * 100, 1),
    'sla_resolution_compliance_pct', ROUND(
      (COUNT(*) FILTER (WHERE status='closed' AND res_hours <= _settings.target_resolution_hours)::numeric
       / NULLIF(COUNT(*) FILTER (WHERE status='closed'), 0)) * 100, 1),
    'stale_open', COUNT(*) FILTER (WHERE status NOT IN ('closed','archived','replied')
                                     AND res_hours > _settings.stale_hours)
  ) INTO _overall FROM base;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'key', category,
    'total', total, 'replied', replied,
    'avg_response_hours', avg_resp,
    'response_compliance_pct', resp_pct,
    'resolution_compliance_pct', res_pct,
    'stale_open', stale_open
  ) ORDER BY total DESC), '[]'::jsonb) INTO _by_category
  FROM (
    SELECT category,
      COUNT(*)::int AS total,
      COUNT(*) FILTER (WHERE replied_at IS NOT NULL)::int AS replied,
      ROUND(AVG(resp_hours)::numeric, 2) AS avg_resp,
      ROUND((COUNT(*) FILTER (WHERE replied_at IS NOT NULL AND resp_hours <= _settings.target_response_hours)::numeric
             / NULLIF(COUNT(*) FILTER (WHERE replied_at IS NOT NULL), 0)) * 100, 1) AS resp_pct,
      ROUND((COUNT(*) FILTER (WHERE status='closed' AND res_hours <= _settings.target_resolution_hours)::numeric
             / NULLIF(COUNT(*) FILTER (WHERE status='closed'), 0)) * 100, 1) AS res_pct,
      COUNT(*) FILTER (WHERE status NOT IN ('closed','archived','replied') AND res_hours > _settings.stale_hours)::int AS stale_open
    FROM (
      SELECT *,
        EXTRACT(EPOCH FROM (replied_at - created_at))/3600.0 AS resp_hours,
        EXTRACT(EPOCH FROM (COALESCE(closed_at, now()) - created_at))/3600.0 AS res_hours
      FROM public.contact_messages
      WHERE created_at >= _from AND created_at <= _to
    ) x
    GROUP BY 1
  ) t;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'key', COALESCE(assignee_id::text, 'unassigned'),
    'name', COALESCE(p.full_name, p.email, 'Unassigned'),
    'total', total, 'replied', replied,
    'avg_response_hours', avg_resp,
    'response_compliance_pct', resp_pct,
    'resolution_compliance_pct', res_pct,
    'stale_open', stale_open
  ) ORDER BY total DESC), '[]'::jsonb) INTO _by_assignee
  FROM (
    SELECT assigned_to AS assignee_id,
      COUNT(*)::int AS total,
      COUNT(*) FILTER (WHERE replied_at IS NOT NULL)::int AS replied,
      ROUND(AVG(EXTRACT(EPOCH FROM (replied_at - created_at))/3600.0)::numeric, 2) AS avg_resp,
      ROUND((COUNT(*) FILTER (WHERE replied_at IS NOT NULL
                                AND EXTRACT(EPOCH FROM (replied_at - created_at))/3600.0 <= _settings.target_response_hours)::numeric
             / NULLIF(COUNT(*) FILTER (WHERE replied_at IS NOT NULL), 0)) * 100, 1) AS resp_pct,
      ROUND((COUNT(*) FILTER (WHERE status='closed'
                                AND EXTRACT(EPOCH FROM (closed_at - created_at))/3600.0 <= _settings.target_resolution_hours)::numeric
             / NULLIF(COUNT(*) FILTER (WHERE status='closed'), 0)) * 100, 1) AS res_pct,
      COUNT(*) FILTER (WHERE status NOT IN ('closed','archived','replied')
                         AND EXTRACT(EPOCH FROM (now() - created_at))/3600.0 > _settings.stale_hours)::int AS stale_open
    FROM public.contact_messages
    WHERE created_at >= _from AND created_at <= _to
    GROUP BY assigned_to
  ) t
  LEFT JOIN public.profiles p ON p.user_id = t.assignee_id;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'key', day, 'total', total, 'replied', replied,
    'response_compliance_pct', resp_pct
  ) ORDER BY day), '[]'::jsonb) INTO _by_day
  FROM (
    SELECT date_trunc('day', created_at)::date AS day,
      COUNT(*)::int AS total,
      COUNT(*) FILTER (WHERE replied_at IS NOT NULL)::int AS replied,
      ROUND((COUNT(*) FILTER (WHERE replied_at IS NOT NULL
                AND EXTRACT(EPOCH FROM (replied_at - created_at))/3600.0 <= _settings.target_response_hours)::numeric
            / NULLIF(COUNT(*) FILTER (WHERE replied_at IS NOT NULL), 0)) * 100, 1) AS resp_pct
    FROM public.contact_messages
    WHERE created_at >= _from AND created_at <= _to
    GROUP BY 1
  ) d;

  RETURN jsonb_build_object(
    'window_start', _from, 'window_end', _to,
    'thresholds', jsonb_build_object(
      'stale_hours', _settings.stale_hours,
      'target_response_hours', _settings.target_response_hours,
      'target_resolution_hours', _settings.target_resolution_hours
    ),
    'overall', _overall,
    'by_category', _by_category,
    'by_assignee', _by_assignee,
    'by_day', _by_day,
    'group_by', _group_by
  );
END $$;
GRANT EXECUTE ON FUNCTION public.get_contact_sla_compliance(timestamptz, timestamptz, text) TO authenticated;

-- 4. List notification log
CREATE OR REPLACE FUNCTION public.list_contact_notification_log(
  _from timestamptz DEFAULT NULL,
  _to   timestamptz DEFAULT NULL,
  _channel text DEFAULT NULL,
  _status text DEFAULT NULL,
  _event_type text DEFAULT NULL,
  _message_id uuid DEFAULT NULL,
  _limit int DEFAULT 500
) RETURNS TABLE (
  id uuid, event_id uuid, message_id uuid, ticket_number text, event_type text,
  channel text, recipient text, status text, attempt_count int, max_attempts int,
  http_status int, error_code text, error_message text, response_body text,
  next_retry_at timestamptz, last_attempt_at timestamptz, created_at timestamptz
) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT n.id, n.event_id, n.message_id, m.ticket_number, n.event_type,
    n.channel, n.recipient, n.status, n.attempt_count, n.max_attempts,
    n.http_status, n.error_code, n.error_message, n.response_body,
    n.next_retry_at, n.last_attempt_at, n.created_at
  FROM public.contact_notification_log n
  LEFT JOIN public.contact_messages m ON m.id = n.message_id
  WHERE public.has_admin_access(auth.uid())
    AND (_from IS NULL OR n.created_at >= _from)
    AND (_to IS NULL OR n.created_at <= _to)
    AND (_channel IS NULL OR n.channel = _channel)
    AND (_status IS NULL OR n.status = _status)
    AND (_event_type IS NULL OR n.event_type = _event_type)
    AND (_message_id IS NULL OR n.message_id = _message_id)
  ORDER BY n.created_at DESC
  LIMIT GREATEST(1, LEAST(COALESCE(_limit, 500), 5000));
$$;
GRANT EXECUTE ON FUNCTION public.list_contact_notification_log(timestamptz, timestamptz, text, text, text, uuid, int) TO authenticated;

-- 5. Cron retry job: every minute
DO $$
DECLARE _jid bigint;
BEGIN
  SELECT jobid INTO _jid FROM cron.job WHERE jobname = 'contact-notification-retries';
  IF _jid IS NOT NULL THEN PERFORM cron.unschedule(_jid); END IF;
END $$;

SELECT cron.schedule(
  'contact-notification-retries',
  '* * * * *',
  $$
  SELECT net.http_post(
    url := 'https://hckpxwhjycmdflaneihd.supabase.co/functions/v1/process-contact-notification-retries',
    headers := '{"Content-Type":"application/json","apikey":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhja3B4d2hqeWNtZGZsYW5laWhkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU3NDgxMDgsImV4cCI6MjA5MTMyNDEwOH0.YDxBd4rKzjvD3OA6nKMu48Am2wbIlG3pqFIZgKLI2CQ"}'::jsonb,
    body := '{}'::jsonb
  ) as request_id;
  $$
);
