-- 1) Add an evaluation window column so admins can tune the alert window
--    (default 6 hours per the new requirement; keeps existing rows on 6h too).
ALTER TABLE public.migration_alert_config
  ADD COLUMN IF NOT EXISTS evaluation_window_hours integer NOT NULL DEFAULT 6;

-- Sanity bound: 1 hour to 7 days
ALTER TABLE public.migration_alert_config
  DROP CONSTRAINT IF EXISTS migration_alert_eval_window_range;
ALTER TABLE public.migration_alert_config
  ADD CONSTRAINT migration_alert_eval_window_range
  CHECK (evaluation_window_hours >= 1 AND evaluation_window_hours <= 168);

-- 2) Generic windowed stats function. Existing 24h function is preserved for
--    backwards compatibility.
CREATE OR REPLACE FUNCTION public.get_migration_failure_stats_window(_hours integer)
RETURNS TABLE(total_events bigint, failed_events bigint, failure_rate numeric)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT
    COUNT(*)::bigint AS total_events,
    COUNT(*) FILTER (WHERE status = 'failed')::bigint AS failed_events,
    CASE
      WHEN COUNT(*) = 0 THEN 0::numeric
      ELSE ROUND(
        (COUNT(*) FILTER (WHERE status = 'failed')::numeric / COUNT(*)::numeric) * 100,
        2
      )
    END AS failure_rate
  FROM public.migration_telemetry
  WHERE created_at >= now() - make_interval(hours => GREATEST(_hours, 1))
    AND status IN ('success', 'failed', 'no_legacy_data');
$function$;

-- Grant execute to the roles the edge function uses
GRANT EXECUTE ON FUNCTION public.get_migration_failure_stats_window(integer)
  TO authenticated, anon, service_role;