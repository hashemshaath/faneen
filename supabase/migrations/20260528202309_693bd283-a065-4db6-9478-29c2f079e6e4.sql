
-- Bulk ban/unban users (super_admin only) with audit
CREATE OR REPLACE FUNCTION public.admin_bulk_set_user_ban(
  _user_ids uuid[],
  _banned boolean
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_affected integer := 0;
  v_actor uuid := auth.uid();
BEGIN
  IF NOT public.has_role(v_actor, 'super_admin'::app_role) THEN
    RAISE EXCEPTION 'forbidden: super_admin only';
  END IF;

  IF _user_ids IS NULL OR array_length(_user_ids, 1) IS NULL THEN
    RETURN 0;
  END IF;

  UPDATE public.profiles
     SET is_banned = _banned,
         updated_at = now()
   WHERE user_id = ANY(_user_ids)
     AND COALESCE(is_banned, false) <> _banned;

  GET DIAGNOSTICS v_affected = ROW_COUNT;

  BEGIN
    INSERT INTO public.admin_activity_log (user_id, action, entity_type, details)
    VALUES (
      v_actor,
      CASE WHEN _banned THEN 'bulk_user_disable' ELSE 'bulk_user_enable' END,
      'profile',
      jsonb_build_object(
        'requested', array_length(_user_ids, 1),
        'affected', v_affected,
        'user_ids', to_jsonb(_user_ids)
      )
    );
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  RETURN v_affected;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_bulk_set_user_ban(uuid[], boolean) TO authenticated;

-- Bulk activate/deactivate businesses (super_admin only) with audit
CREATE OR REPLACE FUNCTION public.admin_bulk_set_business_active(
  _business_ids uuid[],
  _active boolean
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_affected integer := 0;
  v_actor uuid := auth.uid();
BEGIN
  IF NOT public.has_role(v_actor, 'super_admin'::app_role) THEN
    RAISE EXCEPTION 'forbidden: super_admin only';
  END IF;

  IF _business_ids IS NULL OR array_length(_business_ids, 1) IS NULL THEN
    RETURN 0;
  END IF;

  UPDATE public.businesses
     SET is_active = _active,
         updated_at = now()
   WHERE id = ANY(_business_ids)
     AND COALESCE(is_active, false) <> _active;

  GET DIAGNOSTICS v_affected = ROW_COUNT;

  BEGIN
    INSERT INTO public.admin_activity_log (user_id, action, entity_type, details)
    VALUES (
      v_actor,
      CASE WHEN _active THEN 'bulk_business_activate' ELSE 'bulk_business_deactivate' END,
      'business',
      jsonb_build_object(
        'requested', array_length(_business_ids, 1),
        'affected', v_affected,
        'business_ids', to_jsonb(_business_ids)
      )
    );
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  RETURN v_affected;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_bulk_set_business_active(uuid[], boolean) TO authenticated;

COMMENT ON FUNCTION public.admin_bulk_set_user_ban(uuid[], boolean) IS
  'IDENTITY-BULK-1: Super-admin only. Bulk toggles profiles.is_banned and audits to admin_activity_log.';
COMMENT ON FUNCTION public.admin_bulk_set_business_active(uuid[], boolean) IS
  'IDENTITY-BULK-2: Super-admin only. Bulk toggles businesses.is_active and audits to admin_activity_log.';
