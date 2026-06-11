CREATE OR REPLACE FUNCTION public.admin_set_module_override(
  _module_key TEXT,
  _scope_type TEXT,
  _scope_value TEXT,
  _enabled BOOLEAN,
  _reason TEXT DEFAULT NULL
) RETURNS public.system_module_overrides
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _row public.system_module_overrides;
  _is_core BOOLEAN;
BEGIN
  IF NOT public.has_role(auth.uid(), 'super_admin') THEN
    RAISE EXCEPTION 'forbidden: super_admin required' USING ERRCODE = '42501';
  END IF;
  SELECT is_core INTO _is_core FROM public.system_modules WHERE key = _module_key;
  IF _is_core IS NULL THEN RAISE EXCEPTION 'unknown module: %', _module_key; END IF;
  IF _is_core AND _enabled = false THEN RAISE EXCEPTION 'core module cannot be disabled'; END IF;

  INSERT INTO public.system_module_overrides
    (module_key, scope_type, scope_value, enabled, reason, set_by)
  VALUES (_module_key, _scope_type, _scope_value, _enabled, _reason, auth.uid())
  ON CONFLICT (module_key, scope_type, COALESCE(scope_value, '__null__'))
  DO UPDATE SET
    enabled = EXCLUDED.enabled,
    reason = EXCLUDED.reason,
    set_by = EXCLUDED.set_by,
    updated_at = now()
  RETURNING * INTO _row;

  BEGIN
    INSERT INTO public.admin_activity_log (user_id, action, entity_type, details)
    VALUES (
      auth.uid(),
      'set_module_override',
      'system_module',
      jsonb_build_object(
        'module_key', _module_key,
        'scope_type', _scope_type,
        'scope_value', _scope_value,
        'enabled', _enabled,
        'reason', _reason
      )
    );
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  RETURN _row;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.admin_set_module_override(TEXT,TEXT,TEXT,BOOLEAN,TEXT) TO authenticated;