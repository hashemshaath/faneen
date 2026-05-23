-- R4F-7: Membership Lifecycle Observability — read-only admin RPCs
-- ─────────────────────────────────────────────────────────────────
-- Both functions are admin-only, read-only, and do not touch any
-- guarded membership tables or RPCs. They expose pg_cron metadata
-- and lifecycle email markers for the admin observability panel.

-- ── 1. Cron job status ───────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.admin_get_membership_lifecycle_jobs()
RETURNS TABLE (
  jobname text,
  schedule text,
  active boolean,
  last_run_started timestamptz,
  last_run_end timestamptz,
  last_run_status text,
  last_run_return_message text,
  recent_failures_count integer,
  total_runs_7d integer
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, cron
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'admin only' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  WITH target_jobs AS (
    SELECT j.jobid, j.jobname, j.schedule, j.active
    FROM cron.job j
    WHERE j.jobname IN (
      'process-expired-memberships',
      'process-renewal-failures',
      'notify-expiring-memberships',
      'membership-lifecycle-dispatcher'
    )
  ),
  latest_run AS (
    SELECT DISTINCT ON (d.jobid)
      d.jobid, d.start_time, d.end_time, d.status, d.return_message
    FROM cron.job_run_details d
    JOIN target_jobs t ON t.jobid = d.jobid
    ORDER BY d.jobid, d.start_time DESC
  ),
  windowed AS (
    SELECT
      d.jobid,
      COUNT(*) FILTER (
        WHERE d.status = 'failed' AND d.start_time > now() - interval '7 days'
      )::int AS recent_failures_count,
      COUNT(*) FILTER (
        WHERE d.start_time > now() - interval '7 days'
      )::int AS total_runs_7d
    FROM cron.job_run_details d
    JOIN target_jobs t ON t.jobid = d.jobid
    GROUP BY d.jobid
  )
  SELECT
    t.jobname,
    t.schedule,
    t.active,
    lr.start_time          AS last_run_started,
    lr.end_time            AS last_run_end,
    lr.status              AS last_run_status,
    lr.return_message      AS last_run_return_message,
    COALESCE(w.recent_failures_count, 0) AS recent_failures_count,
    COALESCE(w.total_runs_7d, 0)         AS total_runs_7d
  FROM target_jobs t
  LEFT JOIN latest_run lr ON lr.jobid = t.jobid
  LEFT JOIN windowed   w  ON w.jobid  = t.jobid
  ORDER BY t.jobname;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_get_membership_lifecycle_jobs() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_get_membership_lifecycle_jobs() TO authenticated;

-- ── 2. Membership lifecycle email markers ───────────────────────
CREATE OR REPLACE FUNCTION public.admin_get_membership_lifecycle_email_markers(
  p_limit integer DEFAULT 100
)
RETURNS TABLE (
  id uuid,
  template_name text,
  recipient_email text,
  status text,
  created_at timestamptz,
  dispatch_key text,
  message_id text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_limit integer := LEAST(GREATEST(COALESCE(p_limit, 100), 1), 500);
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'admin only' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT DISTINCT ON (l.message_id)
    l.id,
    l.template_name,
    l.recipient_email,
    l.status,
    l.created_at,
    (l.metadata->>'dispatch_key')::text AS dispatch_key,
    l.message_id
  FROM public.email_send_log l
  WHERE l.template_name IN (
    'membership-subscription-expired',
    'membership-renewal-failed',
    'membership-renewal-reminder',
    'membership-promo-redeemed',
    'membership-subscription-activated',
    'membership-tier-changed-by-admin',
    'membership-cancelled-immediately',
    'membership-subscription-cancelled'
  )
  AND l.message_id IS NOT NULL
  ORDER BY l.message_id, l.created_at DESC
  LIMIT v_limit;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_get_membership_lifecycle_email_markers(integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_get_membership_lifecycle_email_markers(integer) TO authenticated;

COMMENT ON FUNCTION public.admin_get_membership_lifecycle_jobs()
  IS 'R4F-7: admin-only, read-only — returns pg_cron status for the 4 membership lifecycle jobs.';
COMMENT ON FUNCTION public.admin_get_membership_lifecycle_email_markers(integer)
  IS 'R4F-7: admin-only, read-only — returns recent membership lifecycle email send_log markers (deduped by message_id).';