
CREATE OR REPLACE FUNCTION public.has_permission(
  _user_id    uuid,
  _entity_id  uuid,
  _permission text
)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role           text;
  v_override       jsonb;
  v_override_bool  boolean;
  v_has_default    boolean;
  v_perm_exists    boolean;
BEGIN
  -- Input validation
  IF _user_id IS NULL OR _entity_id IS NULL OR _permission IS NULL OR length(_permission) = 0 THEN
    RETURN false;
  END IF;

  -- Unknown permission → false
  SELECT EXISTS(SELECT 1 FROM public.permissions_catalog WHERE key = _permission)
    INTO v_perm_exists;
  IF NOT v_perm_exists THEN
    RETURN false;
  END IF;

  -- Entity owner short-circuit
  IF EXISTS(
    SELECT 1 FROM public.businesses
    WHERE id = _entity_id AND user_id = _user_id
  ) THEN
    RETURN true;
  END IF;

  -- Iterate active staff memberships (duplicates: any granting row wins)
  FOR v_role, v_override IN
    SELECT bs.role::text, bs.permissions_override
    FROM public.business_staff bs
    WHERE bs.business_id = _entity_id
      AND bs.user_id     = _user_id
      AND bs.is_active   = true
  LOOP
    -- Role-level short circuits
    IF v_role IN ('owner', 'entity_admin') THEN
      RETURN true;
    END IF;

    -- permissions_override (object form: {"contracts.manage": true})
    IF v_override IS NOT NULL AND jsonb_typeof(v_override) = 'object' THEN
      BEGIN
        v_override_bool := COALESCE((v_override -> _permission)::text::boolean, false);
      EXCEPTION WHEN others THEN
        v_override_bool := false;
      END;
      IF v_override_bool THEN
        RETURN true;
      END IF;
    END IF;

    -- permissions_override (array form: ["contracts.manage", "quotes.respond"])
    IF v_override IS NOT NULL AND jsonb_typeof(v_override) = 'array' THEN
      IF EXISTS(
        SELECT 1
        FROM jsonb_array_elements_text(v_override) AS perm(key)
        WHERE perm.key = _permission
      ) THEN
        RETURN true;
      END IF;
    END IF;

    -- Catalog role defaults
    SELECT EXISTS(
      SELECT 1 FROM public.role_permissions rp
      WHERE rp.role_key = v_role
        AND rp.permission_key = _permission
    ) INTO v_has_default;
    IF v_has_default THEN
      RETURN true;
    END IF;
  END LOOP;

  RETURN false;
END;
$$;

REVOKE ALL ON FUNCTION public.has_permission(uuid, uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_permission(uuid, uuid, text) TO authenticated;

COMMENT ON FUNCTION public.has_permission(uuid, uuid, text) IS
  'WORKSPACE-RBAC-6B: server-side entity-scoped permission check. Returns boolean only. UI-only consumers still go through useCan; future RLS phases will adopt this helper.';
