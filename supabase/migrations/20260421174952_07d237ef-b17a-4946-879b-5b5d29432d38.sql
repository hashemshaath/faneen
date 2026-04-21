-- Add server-controlled migration epoch + RPC to bump it
ALTER TABLE public.migration_alert_config
  ADD COLUMN IF NOT EXISTS migration_epoch integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS last_rerun_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_rerun_by uuid,
  ADD COLUMN IF NOT EXISTS last_rerun_reason text;

-- Public RPC: any client can read the current epoch (no auth needed)
CREATE OR REPLACE FUNCTION public.get_migration_epoch()
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(migration_epoch, 1) FROM public.migration_alert_config WHERE id = 1;
$$;

REVOKE ALL ON FUNCTION public.get_migration_epoch() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_migration_epoch() TO anon, authenticated, service_role;

-- Admin-only RPC: bump epoch (forces every device to re-run on next boot)
CREATE OR REPLACE FUNCTION public.bump_migration_epoch(_reason text DEFAULT NULL)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _new_epoch integer;
BEGIN
  IF NOT has_admin_access(auth.uid()) THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;

  UPDATE public.migration_alert_config
  SET
    migration_epoch = COALESCE(migration_epoch, 1) + 1,
    last_rerun_at = now(),
    last_rerun_by = auth.uid(),
    last_rerun_reason = LEFT(COALESCE(_reason, ''), 500)
  WHERE id = 1
  RETURNING migration_epoch INTO _new_epoch;

  -- Audit trail
  INSERT INTO public.admin_activity_log (user_id, action, entity_type, entity_id, details)
  VALUES (
    auth.uid(),
    'migration_rerun_triggered',
    'migration',
    NULL,
    jsonb_build_object('new_epoch', _new_epoch, 'reason', _reason)
  );

  RETURN _new_epoch;
END;
$$;

REVOKE ALL ON FUNCTION public.bump_migration_epoch(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.bump_migration_epoch(text) TO authenticated;