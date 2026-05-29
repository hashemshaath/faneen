-- POST-LAUNCH-OBSERVABILITY-1 — observability log table + check RPC.

CREATE SEQUENCE IF NOT EXISTS public.seq_obs START 1000;

CREATE TABLE IF NOT EXISTS public.operations_observability_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ref_id text UNIQUE,
  run_type text NOT NULL CHECK (run_type IN (
    'daily_integrity','manual_check','email_health','seo_check',
    'provider_growth','customer_usage'
  )),
  status text NOT NULL CHECK (status IN ('healthy','warning','critical')),
  score numeric NOT NULL CHECK (score >= 0 AND score <= 100),
  summary jsonb NOT NULL DEFAULT '{}'::jsonb,
  alerts  jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid NULL,
  run_day date GENERATED ALWAYS AS ((created_at AT TIME ZONE 'UTC')::date) STORED
);

CREATE INDEX IF NOT EXISTS idx_obs_log_created_at ON public.operations_observability_log (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_obs_log_run_type   ON public.operations_observability_log (run_type, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS uniq_obs_log_day_run_type
  ON public.operations_observability_log (run_type, run_day);

GRANT SELECT ON public.operations_observability_log TO authenticated;
GRANT ALL    ON public.operations_observability_log TO service_role;

ALTER TABLE public.operations_observability_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can read observability log"  ON public.operations_observability_log;
DROP POLICY IF EXISTS "Admins can insert observability log" ON public.operations_observability_log;

CREATE POLICY "Admins can read observability log"
ON public.operations_observability_log
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Admins can insert observability log"
ON public.operations_observability_log
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

CREATE OR REPLACE FUNCTION public.set_obs_ref_id()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.ref_id IS NULL THEN
    NEW.ref_id := public.generate_ref_id('OBS','seq_obs');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_obs_log_ref_id ON public.operations_observability_log;
CREATE TRIGGER trg_obs_log_ref_id
BEFORE INSERT ON public.operations_observability_log
FOR EACH ROW EXECUTE FUNCTION public.set_obs_ref_id();

CREATE OR REPLACE FUNCTION public.run_operations_observability_check(
  _run_type text DEFAULT 'manual_check'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _is_admin  boolean := false;
  _summary   jsonb;
  _score     numeric := 100;
  _status    text    := 'healthy';
  _alerts    jsonb   := '[]'::jsonb;
  _row       public.operations_observability_log;

  _emails_pending bigint := 0;
  _emails_sent    bigint := 0;
  _emails_failed  bigint := 0;
  _emails_total   bigint := 0;
  _email_fail_rate numeric := 0;

  _biz_total       bigint := 0;
  _biz_published   bigint := 0;
  _biz_draft       bigint := 0;
  _biz_username_pending bigint := 0;

  _help_searches    bigint := 0;
  _help_zero_result bigint := 0;

  _open_issue_reports   bigint := 0;
  _open_feature_requests bigint := 0;

  _tracking_links    bigint := 0;
  _feedback_count    bigint := 0;
  _nps_responses     bigint := 0;
BEGIN
  _is_admin := (
    auth.role() = 'service_role'
    OR public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'super_admin')
  );
  IF NOT _is_admin THEN
    RAISE EXCEPTION 'forbidden: admin role required'
      USING ERRCODE = '42501';
  END IF;

  IF _run_type NOT IN ('daily_integrity','manual_check','email_health','seo_check','provider_growth','customer_usage') THEN
    RAISE EXCEPTION 'invalid run_type %', _run_type USING ERRCODE = '22023';
  END IF;

  WITH latest AS (
    SELECT DISTINCT ON (message_id) status, created_at
    FROM public.email_send_log
    WHERE message_id IS NOT NULL
      AND created_at >= now() - interval '7 days'
    ORDER BY message_id, created_at DESC
  )
  SELECT
    coalesce(sum((status = 'pending')::int),0),
    coalesce(sum((status = 'sent')::int),0),
    coalesce(sum((status IN ('dlq','failed','bounced'))::int),0),
    count(*)
  INTO _emails_pending, _emails_sent, _emails_failed, _emails_total
  FROM latest;

  IF _emails_total > 0 THEN
    _email_fail_rate := round((_emails_failed::numeric / _emails_total::numeric) * 100, 2);
  END IF;

  SELECT
    count(*),
    coalesce(sum((is_active = true AND approval_status = 'approved' AND coalesce(is_demo,false) = false)::int),0),
    coalesce(sum((approval_status = 'pending' OR is_active = false)::int),0),
    coalesce(sum((username_status = 'pending')::int),0)
  INTO _biz_total, _biz_published, _biz_draft, _biz_username_pending
  FROM public.businesses;

  SELECT
    count(*),
    coalesce(sum((coalesce(results_count,0) = 0)::int),0)
  INTO _help_searches, _help_zero_result
  FROM public.help_search_logs
  WHERE created_at >= now() - interval '7 days';

  SELECT count(*) INTO _open_issue_reports
  FROM public.help_issue_reports
  WHERE status IN ('open','reviewing');

  SELECT count(*) INTO _open_feature_requests
  FROM public.help_feature_requests
  WHERE status IN ('new','reviewing','planned','in_progress');

  SELECT count(*) INTO _tracking_links FROM public.customer_tracking_links;
  SELECT count(*) INTO _feedback_count FROM public.customer_feedback;
  SELECT count(*) INTO _nps_responses  FROM public.customer_nps_responses;

  _summary := jsonb_build_object(
    'email_delivery', jsonb_build_object(
      'window_days', 7,
      'pending', _emails_pending,
      'sent', _emails_sent,
      'failed', _emails_failed,
      'total', _emails_total,
      'failure_rate_pct', _email_fail_rate
    ),
    'provider_growth', jsonb_build_object(
      'total', _biz_total,
      'published', _biz_published,
      'draft', _biz_draft,
      'username_pending', _biz_username_pending
    ),
    'help_center', jsonb_build_object(
      'window_days', 7,
      'searches', _help_searches,
      'zero_result_searches', _help_zero_result,
      'open_issue_reports', _open_issue_reports,
      'open_feature_requests', _open_feature_requests
    ),
    'customer_experience', jsonb_build_object(
      'tracking_links', _tracking_links,
      'feedback_count', _feedback_count,
      'nps_responses', _nps_responses
    )
  );

  _alerts := '[]'::jsonb;

  IF _email_fail_rate > 20 THEN
    _alerts := _alerts || jsonb_build_object('severity','critical','code','email_failure_rate_high','value',_email_fail_rate);
    _score := _score - 30;
  ELSIF _email_fail_rate > 5 THEN
    _alerts := _alerts || jsonb_build_object('severity','warning','code','email_failure_rate_elevated','value',_email_fail_rate);
    _score := _score - 10;
  END IF;

  IF _biz_published = 0 THEN
    _alerts := _alerts || jsonb_build_object('severity','critical','code','no_published_providers');
    _score := _score - 30;
  ELSIF _biz_draft > _biz_published * 3 AND _biz_draft > 5 THEN
    _alerts := _alerts || jsonb_build_object('severity','warning','code','draft_to_published_ratio_high','draft',_biz_draft,'published',_biz_published);
    _score := _score - 10;
  END IF;

  IF _help_searches > 0 AND _help_zero_result::numeric / _help_searches::numeric > 0.3 THEN
    _alerts := _alerts || jsonb_build_object('severity','warning','code','help_zero_result_high','rate',round(_help_zero_result::numeric / _help_searches::numeric * 100, 2));
    _score := _score - 10;
  END IF;

  IF _open_issue_reports > 10 THEN
    _alerts := _alerts || jsonb_build_object('severity','warning','code','open_issue_reports_high','value',_open_issue_reports);
    _score := _score - 5;
  END IF;

  IF _score < 50 THEN
    _status := 'critical';
  ELSIF _score < 80 THEN
    _status := 'warning';
  END IF;

  _score := greatest(0, least(100, _score));

  INSERT INTO public.operations_observability_log AS l (
    run_type, status, score, summary, alerts, created_by
  )
  VALUES (
    _run_type, _status, _score, _summary, _alerts, auth.uid()
  )
  ON CONFLICT (run_type, run_day)
  DO UPDATE SET
    status     = EXCLUDED.status,
    score      = EXCLUDED.score,
    summary    = EXCLUDED.summary,
    alerts     = EXCLUDED.alerts,
    created_at = now(),
    created_by = EXCLUDED.created_by
  RETURNING * INTO _row;

  RETURN jsonb_build_object(
    'ref_id', _row.ref_id,
    'run_type', _row.run_type,
    'status', _row.status,
    'score', _row.score,
    'summary', _row.summary,
    'alerts', _row.alerts,
    'created_at', _row.created_at
  );
END;
$$;

REVOKE ALL ON FUNCTION public.run_operations_observability_check(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.run_operations_observability_check(text) TO authenticated, service_role;