-- 1) Telemetry: store the reason on each device's event
ALTER TABLE public.migration_telemetry
  ADD COLUMN IF NOT EXISTS rerun_reason text;

-- 2) RLS: extend the insert check so the new column is allowed but length-capped
DROP POLICY IF EXISTS "Anyone can log known migration events" ON public.migration_telemetry;
CREATE POLICY "Anyone can log known migration events" ON public.migration_telemetry
  FOR INSERT TO anon, authenticated
  WITH CHECK (
    migration_key = ANY (ARRAY['localStorage_v1'::text, 'localStorage_faneen_to_qitaat'::text])
    AND length(COALESCE(user_agent, ''::text)) <= 500
    AND length(COALESCE(error_message, ''::text)) <= 1000
    AND length(COALESCE(error_code, ''::text)) <= 64
    AND length(COALESCE(rerun_reason, ''::text)) <= 500
    AND keys_migrated >= 0
    AND keys_migrated <= 100
  );

-- 3) Tighten bump_migration_epoch: reason is now required (5..500 chars after trim)
CREATE OR REPLACE FUNCTION public.bump_migration_epoch(_reason text DEFAULT NULL)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _new_epoch integer;
  _last_at timestamptz;
  _cooldown_min integer;
  _next_at timestamptz;
  _remaining_seconds integer;
  _trimmed text;
BEGIN
  IF NOT has_admin_access(auth.uid()) THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;

  _trimmed := btrim(COALESCE(_reason, ''));
  IF length(_trimmed) < 5 THEN
    RAISE EXCEPTION 'A reason of at least 5 characters is required to broadcast a migration re-run.'
      USING ERRCODE = '22023', -- invalid_parameter_value
            HINT = 'rerun_reason_required';
  END IF;
  IF length(_trimmed) > 500 THEN
    _trimmed := LEFT(_trimmed, 500);
  END IF;

  -- Lock the config row so two admins can't bypass cooldown via a race
  SELECT last_rerun_at, COALESCE(rerun_cooldown_minutes, 60)
    INTO _last_at, _cooldown_min
  FROM public.migration_alert_config
  WHERE id = 1
  FOR UPDATE;

  IF _last_at IS NOT NULL THEN
    _next_at := _last_at + make_interval(mins => _cooldown_min);
    IF now() < _next_at THEN
      _remaining_seconds := GREATEST(1, CEIL(EXTRACT(EPOCH FROM (_next_at - now())))::integer);
      RAISE EXCEPTION
        'Migration re-run is on cooldown. Try again in % seconds (next allowed: %).',
        _remaining_seconds, _next_at
      USING ERRCODE = '55000',
            HINT = 'rerun_cooldown';
    END IF;
  END IF;

  UPDATE public.migration_alert_config
  SET
    migration_epoch = COALESCE(migration_epoch, 1) + 1,
    last_rerun_at = now(),
    last_rerun_by = auth.uid(),
    last_rerun_reason = _trimmed
  WHERE id = 1
  RETURNING migration_epoch INTO _new_epoch;

  INSERT INTO public.admin_activity_log (user_id, action, entity_type, entity_id, details)
  VALUES (
    auth.uid(),
    'migration_rerun_triggered',
    'migration',
    NULL,
    jsonb_build_object(
      'new_epoch', _new_epoch,
      'reason', _trimmed,
      'cooldown_minutes', _cooldown_min
    )
  );

  RETURN _new_epoch;
END;
$$;

REVOKE ALL ON FUNCTION public.bump_migration_epoch(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.bump_migration_epoch(text) TO authenticated;

-- 4) Public RPC: lets every device read the current epoch + active reason
--    in a single round-trip so it can stamp its own telemetry event.
CREATE OR REPLACE FUNCTION public.get_current_migration_rerun()
RETURNS TABLE (
  epoch integer,
  reason text,
  last_rerun_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    COALESCE(migration_epoch, 1) AS epoch,
    NULLIF(btrim(COALESCE(last_rerun_reason, '')), '') AS reason,
    last_rerun_at
  FROM public.migration_alert_config
  WHERE id = 1;
$$;

REVOKE ALL ON FUNCTION public.get_current_migration_rerun() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_current_migration_rerun() TO anon, authenticated, service_role;