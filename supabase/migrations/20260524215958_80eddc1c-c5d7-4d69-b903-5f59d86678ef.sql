
-- ADMIN-CRON-AGGREGATE-RPC-1
-- Server-side aggregate of cron run health, grouped by job_name + function_name.
-- Admin-gated, SECURITY DEFINER, search_path pinned. Does NOT expose summary
-- jsonb or error_message text; only counts, rates, durations, and timestamps.

CREATE OR REPLACE FUNCTION public.get_cron_run_health(
  _since timestamptz DEFAULT NULL
)
RETURNS TABLE (
  job_name text,
  function_name text,
  total_runs bigint,
  ok_runs bigint,
  failed_runs bigint,
  success_rate numeric,
  avg_duration_ms numeric,
  max_duration_ms integer,
  last_run_at timestamptz,
  last_ok_at timestamptz,
  last_failed_at timestamptz,
  latest_status text,
  latest_error_code text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_since timestamptz;
  v_min   timestamptz;
BEGIN
  -- Admin gate (admin OR super_admin). Mirrors cron_run_log RLS.
  IF NOT (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role::text = 'super_admin'
    )
  ) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  -- Default window: 30 days. Clamp lower bound at 180 days back.
  v_since := COALESCE(_since, now() - interval '30 days');
  v_min   := now() - interval '180 days';
  IF v_since < v_min THEN
    v_since := v_min;
  END IF;

  RETURN QUERY
  WITH base AS (
    SELECT
      c.job_name,
      c.function_name,
      c.ok,
      c.status,
      c.error_code,
      c.duration_ms,
      c.started_at
    FROM public.cron_run_log c
    WHERE c.started_at >= v_since
  ),
  latest AS (
    SELECT DISTINCT ON (b.job_name)
      b.job_name,
      b.status      AS latest_status,
      b.error_code  AS latest_error_code,
      b.started_at  AS last_run_at
    FROM base b
    ORDER BY b.job_name, b.started_at DESC
  ),
  latest_ok AS (
    SELECT b.job_name, MAX(b.started_at) AS last_ok_at
    FROM base b WHERE b.ok IS TRUE GROUP BY b.job_name
  ),
  latest_failed AS (
    SELECT b.job_name, MAX(b.started_at) AS last_failed_at
    FROM base b WHERE b.ok IS FALSE GROUP BY b.job_name
  )
  SELECT
    b.job_name,
    MAX(b.function_name)::text AS function_name,
    COUNT(*)::bigint AS total_runs,
    COUNT(*) FILTER (WHERE b.ok IS TRUE)::bigint AS ok_runs,
    COUNT(*) FILTER (WHERE b.ok IS FALSE)::bigint AS failed_runs,
    CASE WHEN COUNT(*) > 0
      THEN ROUND(
        (COUNT(*) FILTER (WHERE b.ok IS TRUE))::numeric * 100.0 / COUNT(*)::numeric,
        2
      )
      ELSE 0
    END AS success_rate,
    ROUND(AVG(b.duration_ms)::numeric, 2) AS avg_duration_ms,
    MAX(b.duration_ms)::integer AS max_duration_ms,
    MAX(l.last_run_at) AS last_run_at,
    MAX(lo.last_ok_at) AS last_ok_at,
    MAX(lf.last_failed_at) AS last_failed_at,
    MAX(l.latest_status)::text AS latest_status,
    MAX(l.latest_error_code)::text AS latest_error_code
  FROM base b
  LEFT JOIN latest        l  ON l.job_name  = b.job_name
  LEFT JOIN latest_ok     lo ON lo.job_name = b.job_name
  LEFT JOIN latest_failed lf ON lf.job_name = b.job_name
  GROUP BY b.job_name
  ORDER BY MAX(l.last_run_at) DESC NULLS LAST, b.job_name ASC;
END;
$$;

REVOKE ALL ON FUNCTION public.get_cron_run_health(timestamptz) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_cron_run_health(timestamptz) TO authenticated, service_role;

COMMENT ON FUNCTION public.get_cron_run_health(timestamptz) IS
  'ADMIN-CRON-AGGREGATE-RPC-1: admin-only aggregate of cron_run_log grouped by job_name. Does not expose summary jsonb or error_message.';
