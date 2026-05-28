-- ORG-RBAC-9F: admin_reassign_business_owner RPC + admin_update_owner_profile helper
-- Allows super_admin to safely transfer business ownership with audit logging.

CREATE OR REPLACE FUNCTION public.admin_reassign_business_owner(
  _business_id uuid,
  _new_owner_user_id uuid,
  _reason text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller uuid := auth.uid();
  v_is_super boolean;
  v_old_owner uuid;
  v_business_ref text;
  v_new_profile_exists boolean;
BEGIN
  -- Auth required
  IF v_caller IS NULL THEN
    RETURN jsonb_build_object('success', false, 'code', 'unauthorized', 'error', 'Authentication required');
  END IF;

  -- Super-admin only
  SELECT public.has_role(v_caller, 'super_admin') INTO v_is_super;
  IF NOT v_is_super THEN
    RETURN jsonb_build_object('success', false, 'code', 'forbidden', 'error', 'super_admin required');
  END IF;

  IF _business_id IS NULL OR _new_owner_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'code', 'invalid_request', 'error', 'business_id and new_owner_user_id required');
  END IF;

  -- Load business
  SELECT user_id, ref_id INTO v_old_owner, v_business_ref
  FROM public.businesses
  WHERE id = _business_id
  LIMIT 1;

  IF v_old_owner IS NULL THEN
    RETURN jsonb_build_object('success', false, 'code', 'not_found', 'error', 'Business not found');
  END IF;

  IF v_old_owner = _new_owner_user_id THEN
    RETURN jsonb_build_object('success', false, 'code', 'noop', 'error', 'New owner is already the current owner');
  END IF;

  -- Verify new owner has a profile
  SELECT EXISTS(SELECT 1 FROM public.profiles WHERE user_id = _new_owner_user_id) INTO v_new_profile_exists;
  IF NOT v_new_profile_exists THEN
    RETURN jsonb_build_object('success', false, 'code', 'new_owner_not_found', 'error', 'New owner profile not found');
  END IF;

  -- Perform transfer
  UPDATE public.businesses
  SET user_id = _new_owner_user_id, updated_at = now()
  WHERE id = _business_id;

  -- Audit log via admin_operation_log (best effort)
  BEGIN
    INSERT INTO public.admin_operation_log (
      admin_user_id, operation, target_type, target_id, metadata
    ) VALUES (
      v_caller,
      'business.owner_reassigned',
      'business',
      _business_id::text,
      jsonb_build_object(
        'business_ref', v_business_ref,
        'old_owner', v_old_owner,
        'new_owner', _new_owner_user_id,
        'reason', _reason
      )
    );
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  RETURN jsonb_build_object(
    'success', true,
    'business_id', _business_id,
    'old_owner', v_old_owner,
    'new_owner', _new_owner_user_id
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_reassign_business_owner(uuid, uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_reassign_business_owner(uuid, uuid, text) TO authenticated, service_role;

COMMENT ON FUNCTION public.admin_reassign_business_owner(uuid, uuid, text)
  IS 'ORG-RBAC-9F: Super-admin only. Transfers businesses.user_id to a new user and logs to admin_operation_log.';