CREATE OR REPLACE FUNCTION public.admin_clear_module_override(
  _module_key TEXT,
  _scope_type TEXT,
  _scope_value TEXT
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _affected INTEGER := 0;
BEGIN
  IF NOT public.has_role(auth.uid(), 'super_admin') THEN
    RAISE EXCEPTION 'forbidden: super_admin required' USING ERRCODE = '42501';
  END IF;

  DELETE FROM public.system_module_overrides
   WHERE module_key = _module_key
     AND scope_type = _scope_type
     AND COALESCE(scope_value, '__null__') = COALESCE(_scope_value, '__null__');
  GET DIAGNOSTICS _affected = ROW_COUNT;

  BEGIN
    INSERT INTO public.admin_activity_log (user_id, action, entity_type, details)
    VALUES (
      auth.uid(),
      'clear_module_override',
      'system_module',
      jsonb_build_object(
        'module_key', _module_key,
        'scope_type', _scope_type,
        'scope_value', _scope_value,
        'affected', _affected
      )
    );
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  RETURN _affected > 0;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.admin_clear_module_override(TEXT,TEXT,TEXT) TO authenticated;