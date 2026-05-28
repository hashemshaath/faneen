
CREATE OR REPLACE FUNCTION public.transfer_primary_manager(
  _business_id uuid,
  _to_user_id uuid,
  _reason text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller uuid := auth.uid();
  v_owner uuid;
  v_is_admin boolean := false;
  v_target_active boolean;
  v_target_role text;
  v_target_is_pm boolean;
  v_current_pm_user uuid;
  v_caller_is_owner boolean := false;
  v_caller_is_current_pm boolean := false;
  v_caller_has_staff_manage boolean := false;
BEGIN
  IF v_caller IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'code', 'forbidden');
  END IF;

  -- Lock the business row to serialize transfers per business.
  SELECT user_id INTO v_owner
  FROM public.businesses
  WHERE id = _business_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'code', 'business_not_found');
  END IF;

  -- Admin check (super_admin or admin)
  BEGIN
    v_is_admin := public.has_role(v_caller, 'super_admin'::public.app_role)
               OR public.has_role(v_caller, 'admin'::public.app_role);
  EXCEPTION WHEN OTHERS THEN
    v_is_admin := false;
  END;

  v_caller_is_owner := (v_caller = v_owner);

  -- Lock the target staff row.
  SELECT is_active, role, COALESCE(is_primary_manager, false)
    INTO v_target_active, v_target_role, v_target_is_pm
  FROM public.business_staff
  WHERE business_id = _business_id AND user_id = _to_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'code', 'target_not_found');
  END IF;

  IF NOT v_target_active THEN
    RETURN jsonb_build_object('ok', false, 'code', 'target_inactive');
  END IF;

  IF v_target_role NOT IN ('owner','entity_admin','business_manager','operations_manager') THEN
    RETURN jsonb_build_object('ok', false, 'code', 'target_role_not_eligible');
  END IF;

  -- Find current active primary manager (lock).
  SELECT user_id INTO v_current_pm_user
  FROM public.business_staff
  WHERE business_id = _business_id
    AND is_active = true
    AND is_primary_manager = true
  FOR UPDATE;

  v_caller_is_current_pm := (v_current_pm_user IS NOT NULL AND v_caller = v_current_pm_user);

  IF v_caller_is_current_pm THEN
    BEGIN
      v_caller_has_staff_manage := COALESCE(
        public.has_permission(v_caller, _business_id, 'staff.manage'),
        false
      );
    EXCEPTION WHEN OTHERS THEN
      v_caller_has_staff_manage := false;
    END;
  END IF;

  IF NOT (v_is_admin OR v_caller_is_owner OR (v_caller_is_current_pm AND v_caller_has_staff_manage)) THEN
    RETURN jsonb_build_object('ok', false, 'code', 'forbidden');
  END IF;

  IF v_target_is_pm THEN
    RETURN jsonb_build_object(
      'ok', true,
      'code', 'already_primary_manager',
      'business_id', _business_id,
      'from_user_id', v_current_pm_user,
      'to_user_id', _to_user_id
    );
  END IF;

  BEGIN
    -- Clear previous PM (if any) first to avoid partial-unique-index conflict.
    IF v_current_pm_user IS NOT NULL THEN
      UPDATE public.business_staff
         SET is_primary_manager = false,
             updated_at = now()
       WHERE business_id = _business_id
         AND user_id = v_current_pm_user
         AND is_active = true
         AND is_primary_manager = true;
    END IF;

    UPDATE public.business_staff
       SET is_primary_manager = true,
           updated_at = now()
     WHERE business_id = _business_id
       AND user_id = _to_user_id
       AND is_active = true;
  EXCEPTION
    WHEN unique_violation THEN
      RETURN jsonb_build_object('ok', false, 'code', 'unique_constraint_conflict');
  END;

  -- Audit (no PII).
  BEGIN
    INSERT INTO public.business_audit_log (business_id, actor_id, entity_type, entity_id, action, metadata)
    VALUES (
      _business_id,
      v_caller,
      'business_staff',
      _business_id,
      'primary_manager.transferred',
      jsonb_build_object(
        'from_user_id', v_current_pm_user,
        'to_user_id', _to_user_id,
        'reason', NULLIF(left(COALESCE(_reason, ''), 240), '')
      )
    );
  EXCEPTION WHEN OTHERS THEN
    -- Audit failure must not break the transfer.
    NULL;
  END;

  RETURN jsonb_build_object(
    'ok', true,
    'code', 'primary_manager_transferred',
    'business_id', _business_id,
    'from_user_id', v_current_pm_user,
    'to_user_id', _to_user_id
  );
END;
$$;

REVOKE ALL ON FUNCTION public.transfer_primary_manager(uuid, uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.transfer_primary_manager(uuid, uuid, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.transfer_primary_manager(uuid, uuid, text) TO authenticated;

COMMENT ON FUNCTION public.transfer_primary_manager(uuid, uuid, text) IS
  'ORG-RBAC-STRUCTURE-9C: Atomically transfer primary manager within a business. Owner / admin / current PM with staff.manage only. Does not change ownership.';
