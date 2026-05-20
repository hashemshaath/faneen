
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.auth_temporary_login_codes (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier      text NOT NULL,
  code_hash       text NOT NULL,
  purpose         text NOT NULL DEFAULT 'beta_login',
  user_id         uuid NULL,
  role_hint       text NULL,
  expires_at      timestamptz NOT NULL,
  used_at         timestamptz NULL,
  created_by      uuid NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  attempt_count   int NOT NULL DEFAULT 0,
  max_attempts    int NOT NULL DEFAULT 5,
  revoked_at      timestamptz NULL,
  metadata        jsonb NULL
);

CREATE INDEX IF NOT EXISTS idx_atlc_identifier_expires
  ON public.auth_temporary_login_codes (identifier, expires_at DESC);

CREATE INDEX IF NOT EXISTS idx_atlc_active
  ON public.auth_temporary_login_codes (identifier, purpose)
  WHERE used_at IS NULL AND revoked_at IS NULL;

ALTER TABLE public.auth_temporary_login_codes ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.auth_temporary_login_codes FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public._atlc_normalize_identifier(_identifier text)
RETURNS text LANGUAGE plpgsql IMMUTABLE SET search_path = public AS $$
DECLARE v text;
BEGIN
  IF _identifier IS NULL THEN RETURN NULL; END IF;
  v := lower(btrim(_identifier));
  IF position('@' IN v) = 0 AND v ~ '^[+0-9 \-()]+$' THEN
    v := regexp_replace(v, '\D', '', 'g');
    v := regexp_replace(v, '^0+', '');
  END IF;
  RETURN v;
END;
$$;

CREATE OR REPLACE FUNCTION public._atlc_mask_identifier(_identifier text)
RETURNS text LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE
    WHEN _identifier IS NULL OR length(_identifier) = 0 THEN ''
    WHEN position('@' IN _identifier) > 0 THEN
      left(_identifier, 1) || '***' || substring(_identifier FROM position('@' IN _identifier))
    WHEN length(_identifier) <= 4 THEN repeat('*', length(_identifier))
    ELSE left(_identifier, 2) || repeat('*', length(_identifier) - 4) || right(_identifier, 2)
  END;
$$;

CREATE OR REPLACE FUNCTION public._atlc_hash(_code text, _row_id uuid)
RETURNS text LANGUAGE sql IMMUTABLE AS $$
  SELECT encode(digest(_code || ':' || _row_id::text, 'sha256'), 'hex');
$$;

CREATE OR REPLACE FUNCTION public.create_temporary_login_code(
  _identifier text,
  _user_id    uuid DEFAULT NULL,
  _purpose    text DEFAULT 'beta_login'
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_caller     uuid := auth.uid();
  v_is_admin   boolean;
  v_identifier text;
  v_code       text;
  v_id         uuid := gen_random_uuid();
  v_expires    timestamptz := now() + interval '10 minutes';
  v_rand_int   bigint;
BEGIN
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'AUTH_TEMP_CODE:FORBIDDEN';
  END IF;
  v_is_admin := public.has_role(v_caller, 'admin'::public.app_role)
             OR public.has_role(v_caller, 'super_admin'::public.app_role);
  IF NOT v_is_admin THEN
    RAISE EXCEPTION 'AUTH_TEMP_CODE:FORBIDDEN';
  END IF;

  v_identifier := public._atlc_normalize_identifier(_identifier);
  IF v_identifier IS NULL OR length(v_identifier) < 3 THEN
    RAISE EXCEPTION 'AUTH_TEMP_CODE:INVALID_IDENTIFIER';
  END IF;

  UPDATE public.auth_temporary_login_codes
     SET revoked_at = now()
   WHERE identifier = v_identifier
     AND purpose    = COALESCE(_purpose, 'beta_login')
     AND used_at IS NULL
     AND revoked_at IS NULL;

  -- Crypto-safe 6-digit code via 4 random bytes -> bigint -> mod 1,000,000
  v_rand_int := ('x' || encode(gen_random_bytes(4), 'hex'))::bit(32)::bigint;
  v_code := lpad((v_rand_int % 1000000)::text, 6, '0');

  INSERT INTO public.auth_temporary_login_codes
    (id, identifier, code_hash, purpose, user_id, expires_at, created_by, metadata)
  VALUES
    (v_id, v_identifier, public._atlc_hash(v_code, v_id),
     COALESCE(_purpose, 'beta_login'), _user_id, v_expires, v_caller,
     jsonb_build_object('source','admin_rpc'));

  RETURN jsonb_build_object(
    'identifier',  public._atlc_mask_identifier(v_identifier),
    'code',        v_code,
    'expires_at',  v_expires,
    'purpose',     COALESCE(_purpose, 'beta_login')
  );
END;
$$;

REVOKE ALL ON FUNCTION public.create_temporary_login_code(text, uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_temporary_login_code(text, uuid, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.verify_temporary_login_code(
  _identifier text,
  _code       text
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
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
$$;

REVOKE ALL ON FUNCTION public.verify_temporary_login_code(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.verify_temporary_login_code(text, text) TO anon, authenticated;

REVOKE ALL ON FUNCTION public._atlc_hash(text, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public._atlc_normalize_identifier(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public._atlc_mask_identifier(text) FROM PUBLIC, anon, authenticated;
