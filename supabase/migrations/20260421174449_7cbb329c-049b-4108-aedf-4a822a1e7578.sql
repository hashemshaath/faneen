-- Migration alert configuration (single row)
CREATE TABLE IF NOT EXISTS public.migration_alert_config (
  id integer PRIMARY KEY DEFAULT 1,
  enabled boolean NOT NULL DEFAULT true,
  failure_rate_threshold numeric(5,2) NOT NULL DEFAULT 25.00,
  min_sample_size integer NOT NULL DEFAULT 20,
  cooldown_hours integer NOT NULL DEFAULT 6,
  notify_emails text[] NOT NULL DEFAULT '{}',
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid,
  CONSTRAINT migration_alert_config_singleton CHECK (id = 1),
  CONSTRAINT migration_alert_threshold_range CHECK (failure_rate_threshold > 0 AND failure_rate_threshold <= 100),
  CONSTRAINT migration_alert_min_sample CHECK (min_sample_size >= 1)
);

INSERT INTO public.migration_alert_config (id) VALUES (1)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.migration_alert_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read migration alert config"
  ON public.migration_alert_config FOR SELECT
  TO authenticated
  USING (has_admin_access(auth.uid()));

CREATE POLICY "Admins can update migration alert config"
  ON public.migration_alert_config FOR UPDATE
  TO authenticated
  USING (has_admin_access(auth.uid()))
  WITH CHECK (has_admin_access(auth.uid()));

-- Sent alerts log (for cooldown + audit)
CREATE TABLE IF NOT EXISTS public.migration_alerts_sent (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sent_at timestamptz NOT NULL DEFAULT now(),
  failure_rate numeric(5,2) NOT NULL,
  total_events integer NOT NULL,
  failed_events integer NOT NULL,
  threshold numeric(5,2) NOT NULL,
  recipients text[] NOT NULL DEFAULT '{}',
  channel text NOT NULL DEFAULT 'email',
  details jsonb
);

CREATE INDEX IF NOT EXISTS idx_migration_alerts_sent_at
  ON public.migration_alerts_sent (sent_at DESC);

ALTER TABLE public.migration_alerts_sent ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read migration alerts sent"
  ON public.migration_alerts_sent FOR SELECT
  TO authenticated
  USING (has_admin_access(auth.uid()));

-- Helper function: compute 24h failure stats (admins only)
CREATE OR REPLACE FUNCTION public.get_migration_failure_stats_24h()
RETURNS TABLE (
  total_events bigint,
  failed_events bigint,
  failure_rate numeric
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    COUNT(*)::bigint AS total_events,
    COUNT(*) FILTER (WHERE status = 'failed')::bigint AS failed_events,
    CASE
      WHEN COUNT(*) = 0 THEN 0::numeric
      ELSE ROUND((COUNT(*) FILTER (WHERE status = 'failed')::numeric / COUNT(*)::numeric) * 100, 2)
    END AS failure_rate
  FROM public.migration_telemetry
  WHERE created_at >= now() - interval '24 hours'
    AND status IN ('success', 'failed', 'no_legacy_data');
$$;

REVOKE ALL ON FUNCTION public.get_migration_failure_stats_24h() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_migration_failure_stats_24h() TO authenticated, service_role;