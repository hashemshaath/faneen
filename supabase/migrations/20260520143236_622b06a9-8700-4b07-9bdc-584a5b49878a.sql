-- Client Sites Phase 2.4 — QR Token Issue / Rotate / Revoke + Visibility setter

-- 1. Authorization helper
CREATE OR REPLACE FUNCTION public.client_site_can_manage(_user_id uuid, _site public.client_sites)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT _user_id IS NOT NULL AND (
       (_site.owner_user_id IS NOT NULL AND _site.owner_user_id = _user_id)
    OR (_site.client_user_id IS NOT NULL AND _site.client_user_id = _user_id)
    OR public.is_business_owner_or_manager(_user_id, _site.business_id)
    OR public.has_role(_user_id, 'admin'::app_role)
    OR public.has_role(_user_id, 'super_admin'::app_role)
  );
$$;
REVOKE EXECUTE ON FUNCTION public.client_site_can_manage(uuid, public.client_sites) FROM PUBLIC, anon, authenticated;

-- 2. URL-safe random token generator (32 bytes entropy, ~43 chars)
CREATE OR REPLACE FUNCTION public._gen_client_site_qr_token()
RETURNS text
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_raw text;
BEGIN
  v_raw := encode(extensions.gen_random_bytes(32), 'base64');
  v_raw := replace(replace(replace(v_raw, E'\n', ''), E'\r', ''), '=', '');
  v_raw := replace(replace(v_raw, '+', '-'), '/', '_');
  RETURN v_raw;
END;
$$;
REVOKE EXECUTE ON FUNCTION public._gen_client_site_qr_token() FROM PUBLIC, anon, authenticated;

-- 3. issue_client_site_qr_token
CREATE OR REPLACE FUNCTION public.issue_client_site_qr_token(_site_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_uid   uuid := auth.uid();
  v_row   public.client_sites%ROWTYPE;
  v_token text;
  v_hash  text;
  v_warn  text;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'AUTH_REQUIRED' USING ERRCODE = '28000'; END IF;
  IF _site_id IS NULL THEN RAISE EXCEPTION 'SITE_ID_REQUIRED' USING ERRCODE = '22023'; END IF;

  SELECT * INTO v_row FROM public.client_sites WHERE id = _site_id;
  IF v_row.id IS NULL THEN RAISE EXCEPTION 'SITE_NOT_FOUND' USING ERRCODE = 'P0002'; END IF;
  IF v_row.archived_at IS NOT NULL THEN RAISE EXCEPTION 'SITE_ARCHIVED' USING ERRCODE = '22023'; END IF;
  IF NOT public.client_site_can_manage(v_uid, v_row) THEN
    RAISE EXCEPTION 'FORBIDDEN' USING ERRCODE = '42501';
  END IF;

  v_token := public._gen_client_site_qr_token();
  v_hash  := encode(extensions.digest(v_token, 'sha256'), 'hex');

  UPDATE public.client_sites
     SET qr_token_hash  = v_hash,
         qr_enabled     = true,
         qr_revoked_at  = NULL
   WHERE id = v_row.id
   RETURNING * INTO v_row;

  IF v_row.visibility = 'private' THEN v_warn := 'visibility_private'; END IF;

  RETURN jsonb_build_object(
    'site_ref',         v_row.site_ref,
    'token',            v_token,
    'url',              '/s/' || v_token,
    'qr_enabled',       v_row.qr_enabled,
    'visibility',       v_row.visibility,
    'expires_warning',  v_warn
  );
END;
$$;
REVOKE EXECUTE ON FUNCTION public.issue_client_site_qr_token(uuid) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.issue_client_site_qr_token(uuid) TO authenticated;

-- 4. rotate_client_site_qr_token
CREATE OR REPLACE FUNCTION public.rotate_client_site_qr_token(_site_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_uid   uuid := auth.uid();
  v_row   public.client_sites%ROWTYPE;
  v_token text;
  v_hash  text;
  v_warn  text;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'AUTH_REQUIRED' USING ERRCODE = '28000'; END IF;
  IF _site_id IS NULL THEN RAISE EXCEPTION 'SITE_ID_REQUIRED' USING ERRCODE = '22023'; END IF;

  SELECT * INTO v_row FROM public.client_sites WHERE id = _site_id;
  IF v_row.id IS NULL THEN RAISE EXCEPTION 'SITE_NOT_FOUND' USING ERRCODE = 'P0002'; END IF;
  IF v_row.archived_at IS NOT NULL THEN RAISE EXCEPTION 'SITE_ARCHIVED' USING ERRCODE = '22023'; END IF;
  IF NOT public.client_site_can_manage(v_uid, v_row) THEN
    RAISE EXCEPTION 'FORBIDDEN' USING ERRCODE = '42501';
  END IF;

  v_token := public._gen_client_site_qr_token();
  v_hash  := encode(extensions.digest(v_token, 'sha256'), 'hex');

  UPDATE public.client_sites
     SET qr_token_hash  = v_hash,
         qr_enabled     = true,
         qr_revoked_at  = NULL
   WHERE id = v_row.id
   RETURNING * INTO v_row;

  IF v_row.visibility = 'private' THEN v_warn := 'visibility_private'; END IF;

  RETURN jsonb_build_object(
    'site_ref',         v_row.site_ref,
    'token',            v_token,
    'url',              '/s/' || v_token,
    'qr_enabled',       v_row.qr_enabled,
    'visibility',       v_row.visibility,
    'expires_warning',  v_warn,
    'rotated',          true
  );
END;
$$;
REVOKE EXECUTE ON FUNCTION public.rotate_client_site_qr_token(uuid) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.rotate_client_site_qr_token(uuid) TO authenticated;

-- 5. revoke_client_site_qr_token
CREATE OR REPLACE FUNCTION public.revoke_client_site_qr_token(_site_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_row public.client_sites%ROWTYPE;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'AUTH_REQUIRED' USING ERRCODE = '28000'; END IF;
  IF _site_id IS NULL THEN RAISE EXCEPTION 'SITE_ID_REQUIRED' USING ERRCODE = '22023'; END IF;

  SELECT * INTO v_row FROM public.client_sites WHERE id = _site_id;
  IF v_row.id IS NULL THEN RAISE EXCEPTION 'SITE_NOT_FOUND' USING ERRCODE = 'P0002'; END IF;
  IF NOT public.client_site_can_manage(v_uid, v_row) THEN
    RAISE EXCEPTION 'FORBIDDEN' USING ERRCODE = '42501';
  END IF;

  UPDATE public.client_sites
     SET qr_enabled    = false,
         qr_revoked_at = now()
   WHERE id = v_row.id
   RETURNING * INTO v_row;

  RETURN jsonb_build_object('revoked', true, 'site_ref', v_row.site_ref);
END;
$$;
REVOKE EXECUTE ON FUNCTION public.revoke_client_site_qr_token(uuid) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.revoke_client_site_qr_token(uuid) TO authenticated;

-- 6. set_client_site_visibility
CREATE OR REPLACE FUNCTION public.set_client_site_visibility(_site_id uuid, _visibility text)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_row public.client_sites%ROWTYPE;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'AUTH_REQUIRED' USING ERRCODE = '28000'; END IF;
  IF _site_id IS NULL THEN RAISE EXCEPTION 'SITE_ID_REQUIRED' USING ERRCODE = '22023'; END IF;
  IF _visibility IS NULL OR _visibility NOT IN ('private','shared_by_qr','public_limited') THEN
    RAISE EXCEPTION 'INVALID_VISIBILITY' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_row FROM public.client_sites WHERE id = _site_id;
  IF v_row.id IS NULL THEN RAISE EXCEPTION 'SITE_NOT_FOUND' USING ERRCODE = 'P0002'; END IF;
  IF v_row.archived_at IS NOT NULL THEN RAISE EXCEPTION 'SITE_ARCHIVED' USING ERRCODE = '22023'; END IF;
  IF NOT public.client_site_can_manage(v_uid, v_row) THEN
    RAISE EXCEPTION 'FORBIDDEN' USING ERRCODE = '42501';
  END IF;

  UPDATE public.client_sites
     SET visibility = _visibility
   WHERE id = v_row.id
   RETURNING * INTO v_row;

  RETURN jsonb_build_object(
    'site_ref',   v_row.site_ref,
    'site_name',  v_row.site_name,
    'site_type',  v_row.site_type,
    'visibility', v_row.visibility,
    'qr_enabled', v_row.qr_enabled
  );
END;
$$;
REVOKE EXECUTE ON FUNCTION public.set_client_site_visibility(uuid, text) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.set_client_site_visibility(uuid, text) TO authenticated;