-- Allow new audit action for QR rotation
ALTER TABLE public.admin_client_site_access_audit
  DROP CONSTRAINT IF EXISTS acsaa_action_chk;
ALTER TABLE public.admin_client_site_access_audit
  ADD CONSTRAINT acsaa_action_chk CHECK (action = ANY (ARRAY[
    'sensitive_detail_revealed'::text,
    'contact_action_started'::text,
    'operations_note_added'::text,
    'status_reviewed'::text,
    'qr_token_rotated'::text
  ]));

-- Admin-only audited QR rotation
CREATE OR REPLACE FUNCTION public.admin_rotate_client_site_qr_token(
  _site_id uuid,
  _reason  text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_uid   uuid := auth.uid();
  v_row   public.client_sites%ROWTYPE;
  v_token text;
  v_hash  text;
  v_warn  text;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'AUTH_REQUIRED' USING ERRCODE = '28000';
  END IF;
  IF NOT (public.has_role(v_uid, 'admin'::public.app_role)
       OR public.has_role(v_uid, 'super_admin'::public.app_role)) THEN
    RAISE EXCEPTION 'FORBIDDEN' USING ERRCODE = '42501';
  END IF;
  IF _site_id IS NULL THEN
    RAISE EXCEPTION 'SITE_ID_REQUIRED' USING ERRCODE = '22023';
  END IF;
  IF _reason IS NULL OR length(btrim(_reason)) < 5 THEN
    RAISE EXCEPTION 'REASON_REQUIRED' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_row FROM public.client_sites WHERE id = _site_id;
  IF v_row.id IS NULL THEN
    RAISE EXCEPTION 'SITE_NOT_FOUND' USING ERRCODE = 'P0002';
  END IF;
  IF v_row.archived_at IS NOT NULL THEN
    RAISE EXCEPTION 'SITE_ARCHIVED' USING ERRCODE = '22023';
  END IF;

  v_token := public._gen_client_site_qr_token();
  v_hash  := encode(extensions.digest(v_token, 'sha256'), 'hex');

  UPDATE public.client_sites
     SET qr_token_hash = v_hash,
         qr_enabled    = true,
         qr_revoked_at = NULL
   WHERE id = v_row.id
   RETURNING * INTO v_row;

  IF v_row.visibility = 'private' THEN
    v_warn := 'visibility_private';
  END IF;

  INSERT INTO public.admin_client_site_access_audit
    (site_id, admin_user_id, action, reason, metadata)
  VALUES
    (v_row.id, v_uid, 'qr_token_rotated', btrim(_reason),
     jsonb_build_object('site_ref', v_row.site_ref, 'visibility', v_row.visibility));

  RETURN jsonb_build_object(
    'site_ref',        v_row.site_ref,
    'token',           v_token,
    'url',             '/s/' || v_token,
    'qr_enabled',      v_row.qr_enabled,
    'visibility',      v_row.visibility,
    'expires_warning', v_warn,
    'rotated',         true
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.admin_rotate_client_site_qr_token(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_rotate_client_site_qr_token(uuid, text) TO authenticated;