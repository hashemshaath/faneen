CREATE OR REPLACE FUNCTION public.get_migration_rerun_history(_limit integer DEFAULT 20)
RETURNS TABLE (
  rerun_at timestamptz,
  triggered_by uuid,
  triggered_by_name text,
  triggered_by_email text,
  new_epoch integer,
  reason text,
  cooldown_minutes integer,
  window_until timestamptz,
  total_events bigint,
  success_events bigint,
  failed_events bigint,
  unique_users bigint
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _lim integer := GREATEST(1, LEAST(COALESCE(_limit, 20), 100));
BEGIN
  IF NOT has_admin_access(auth.uid()) THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;

  RETURN QUERY
  WITH reruns AS (
    SELECT
      al.created_at AS rerun_at,
      al.user_id    AS triggered_by,
      NULLIF(al.details ->> 'reason', '')                  AS reason,
      NULLIF(al.details ->> 'new_epoch', '')::integer      AS new_epoch,
      NULLIF(al.details ->> 'cooldown_minutes', '')::integer AS cooldown_minutes,
      LEAD(al.created_at) OVER (ORDER BY al.created_at DESC) AS prev_rerun_at
    FROM public.admin_activity_log al
    WHERE al.action = 'migration_rerun_triggered'
    ORDER BY al.created_at DESC
    LIMIT _lim
  )
  SELECT
    r.rerun_at,
    r.triggered_by,
    p.full_name                                    AS triggered_by_name,
    COALESCE(p.login_email, p.email)               AS triggered_by_email,
    r.new_epoch,
    r.reason,
    r.cooldown_minutes,
    -- Window end = the next (newer) rerun, or now if this is the most recent.
    -- LEAD with DESC ordering gives us the previous (older) rerun, so we use a
    -- second pass keyed by rerun_at to find the upper bound.
    (
      SELECT MIN(r2.rerun_at)
      FROM reruns r2
      WHERE r2.rerun_at > r.rerun_at
    )                                              AS window_until,
    (
      SELECT COUNT(*)
      FROM public.migration_telemetry mt
      WHERE mt.created_at >= r.rerun_at
        AND mt.created_at < COALESCE(
          (SELECT MIN(r2.rerun_at) FROM reruns r2 WHERE r2.rerun_at > r.rerun_at),
          now() + interval '1 second'
        )
        AND mt.status IN ('success', 'failed', 'no_legacy_data')
    )::bigint                                      AS total_events,
    (
      SELECT COUNT(*)
      FROM public.migration_telemetry mt
      WHERE mt.created_at >= r.rerun_at
        AND mt.created_at < COALESCE(
          (SELECT MIN(r2.rerun_at) FROM reruns r2 WHERE r2.rerun_at > r.rerun_at),
          now() + interval '1 second'
        )
        AND mt.status = 'success'
    )::bigint                                      AS success_events,
    (
      SELECT COUNT(*)
      FROM public.migration_telemetry mt
      WHERE mt.created_at >= r.rerun_at
        AND mt.created_at < COALESCE(
          (SELECT MIN(r2.rerun_at) FROM reruns r2 WHERE r2.rerun_at > r.rerun_at),
          now() + interval '1 second'
        )
        AND mt.status = 'failed'
    )::bigint                                      AS failed_events,
    (
      SELECT COUNT(DISTINCT COALESCE(mt.user_id::text, mt.user_agent))
      FROM public.migration_telemetry mt
      WHERE mt.created_at >= r.rerun_at
        AND mt.created_at < COALESCE(
          (SELECT MIN(r2.rerun_at) FROM reruns r2 WHERE r2.rerun_at > r.rerun_at),
          now() + interval '1 second'
        )
        AND mt.status IN ('success', 'failed', 'no_legacy_data')
    )::bigint                                      AS unique_users
  FROM reruns r
  LEFT JOIN public.profiles p ON p.user_id = r.triggered_by
  ORDER BY r.rerun_at DESC;
END;
$$;

REVOKE ALL ON FUNCTION public.get_migration_rerun_history(integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_migration_rerun_history(integer) TO authenticated;