ALTER TABLE public.migration_alert_config
  ADD COLUMN IF NOT EXISTS rerun_cooldown_minutes integer NOT NULL DEFAULT 60;

ALTER TABLE public.migration_alert_config
  DROP CONSTRAINT IF EXISTS migration_alert_config_rerun_cooldown_chk;
ALTER TABLE public.migration_alert_config
  ADD CONSTRAINT migration_alert_config_rerun_cooldown_chk
  CHECK (rerun_cooldown_minutes BETWEEN 1 AND 10080);

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
BEGIN
  IF NOT has_admin_access(auth.uid()) THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;

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
    last_rerun_reason = LEFT(COALESCE(_reason, ''), 500)
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
      'reason', _reason,
      'cooldown_minutes', _cooldown_min
    )
  );

  RETURN _new_epoch;
END;
$$;

REVOKE ALL ON FUNCTION public.bump_migration_epoch(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.bump_migration_epoch(text) TO authenticated;