CREATE OR REPLACE FUNCTION public.verify_temporary_login_code(_identifier text, _code text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_identifier text;
  v_row        public.auth_temporary_login_codes%ROWTYPE;
  v_recent     int;
BEGIN
  v_identifier := public._atlc_normalize_identifier(_identifier);
  IF v_identifier IS NULL OR _code IS NULL OR length(_code) < 4 THEN
    RAISE EXCEPTION 'AUTH_TEMP_CODE:INVALID_OR_EXPIRED';
  END IF;

  SELECT COALESCE(SUM(attempt_count), 0) INTO v_recent
    FROM public.auth_temporary_login_codes
   WHERE identifier = v_identifier
     AND created_at > now() - interval '5 minutes';
  IF v_recent >= 20 THEN
    RAISE EXCEPTION 'AUTH_TEMP_CODE:TOO_MANY_ATTEMPTS';
  END IF;

  SELECT * INTO v_row
    FROM public.auth_temporary_login_codes
   WHERE identifier = v_identifier
     AND used_at IS NULL
     AND revoked_at IS NULL
     AND expires_at > now()
   ORDER BY created_at DESC
   LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'AUTH_TEMP_CODE:INVALID_OR_EXPIRED';
  END IF;

  IF v_row.attempt_count >= v_row.max_attempts THEN
    RAISE EXCEPTION 'AUTH_TEMP_CODE:TOO_MANY_ATTEMPTS';
  END IF;

  IF v_row.code_hash <> public._atlc_hash(_code, v_row.id) THEN
    UPDATE public.auth_temporary_login_codes
       SET attempt_count = attempt_count + 1
     WHERE id = v_row.id;
    RAISE EXCEPTION 'AUTH_TEMP_CODE:INVALID_OR_EXPIRED';
  END IF;

  UPDATE public.auth_temporary_login_codes
     SET used_at = now(),
         attempt_count = attempt_count + 1
   WHERE id = v_row.id;

  RETURN jsonb_build_object(
    'verified',   true,
    'identifier', public._atlc_mask_identifier(v_identifier),
    'purpose',    v_row.purpose,
    'user_id',    v_row.user_id
  );
END;
$function$;