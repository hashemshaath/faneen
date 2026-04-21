CREATE TABLE public.migration_telemetry (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  migration_key text NOT NULL,
  status text NOT NULL CHECK (status IN ('success', 'failed', 'skipped', 'no_legacy_data')),
  keys_migrated integer NOT NULL DEFAULT 0,
  user_agent text,
  error_message text,
  user_id uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX idx_migration_telemetry_key_status ON public.migration_telemetry(migration_key, status, created_at DESC);
CREATE INDEX idx_migration_telemetry_created ON public.migration_telemetry(created_at DESC);

ALTER TABLE public.migration_telemetry ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can log migration events"
  ON public.migration_telemetry
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Admins can read migration telemetry"
  ON public.migration_telemetry
  FOR SELECT
  TO authenticated
  USING (public.has_admin_access(auth.uid()));

CREATE OR REPLACE FUNCTION public.cleanup_old_migration_telemetry()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  DELETE FROM public.migration_telemetry WHERE created_at < now() - interval '90 days';
$$;