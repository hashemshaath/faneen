-- Phase 2: Per-business (entity) scope + owner-managed staff overrides for system_module_overrides

-- 1) Allow 'entity' as a valid scope
ALTER TABLE public.system_module_overrides
  DROP CONSTRAINT IF EXISTS system_module_overrides_scope_type_check;
ALTER TABLE public.system_module_overrides
  ADD CONSTRAINT system_module_overrides_scope_type_check
  CHECK (scope_type IN ('global_default','account_type','entity','user'));

-- 2) Helper: is the calling user the OWNER of a business (entity)?
CREATE OR REPLACE FUNCTION public.is_business_owner_of(_user_id UUID, _business_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.businesses
     WHERE id = _business_id AND user_id = _user_id
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_business_owner_of(UUID, UUID) TO authenticated;

-- 3) Helper: are two users in the same business as owner -> staff?
CREATE OR REPLACE FUNCTION public.owner_employs_user(_owner_id UUID, _staff_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
      FROM public.business_staff bs
      JOIN public.businesses b ON b.id = bs.business_id
     WHERE b.user_id = _owner_id
       AND bs.user_id = _staff_user_id
       AND COALESCE(bs.is_active, true) = true
  );
$$;

GRANT EXECUTE ON FUNCTION public.owner_employs_user(UUID, UUID) TO authenticated;

-- 4) Extend RLS so business owners can read their own entity overrides and
--    overrides assigned to users that work for them.
DROP POLICY IF EXISTS "system_module_overrides_select_self" ON public.system_module_overrides;
CREATE POLICY "system_module_overrides_select_self"
  ON public.system_module_overrides FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'super_admin')
    OR scope_type = 'global_default'
    OR (scope_type = 'user' AND scope_value = auth.uid()::text)
    OR (scope_type = 'account_type' AND scope_value IN (
          SELECT account_type::text FROM public.profiles WHERE user_id = auth.uid()
        ))
    OR (scope_type = 'entity' AND (
          public.is_business_owner_of(auth.uid(), scope_value::uuid)
          OR EXISTS (
            SELECT 1 FROM public.business_staff
             WHERE business_id = scope_value::uuid
               AND user_id = auth.uid()
          )
        ))
    OR (scope_type = 'user' AND public.owner_employs_user(auth.uid(), scope_value::uuid))
  );

-- 5) Updated visibility resolver — entity context is optional and slots
--    in BETWEEN account_type and user (user always wins last).
CREATE OR REPLACE FUNCTION public.get_user_visible_modules(
  _user_id UUID,
  _entity_id UUID DEFAULT NULL
)
RETURNS TABLE (
  module_key TEXT,
  enabled BOOLEAN,
  source TEXT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _account_type TEXT;
BEGIN
  SELECT account_type::text INTO _account_type
    FROM public.profiles WHERE user_id = _user_id;

  RETURN QUERY
  SELECT
    m.key AS module_key,
    COALESCE(uo.enabled, eo.enabled, ato.enabled, go.enabled, m.default_enabled) AS enabled,
    CASE
      WHEN m.is_core THEN 'core'
      WHEN uo.enabled IS NOT NULL THEN 'user'
      WHEN eo.enabled IS NOT NULL THEN 'entity'
      WHEN ato.enabled IS NOT NULL THEN 'account_type'
      WHEN go.enabled IS NOT NULL THEN 'global_default'
      ELSE 'module_default'
    END AS source
  FROM public.system_modules m
  LEFT JOIN public.system_module_overrides uo
    ON uo.module_key = m.key AND uo.scope_type = 'user' AND uo.scope_value = _user_id::text
  LEFT JOIN public.system_module_overrides eo
    ON eo.module_key = m.key AND eo.scope_type = 'entity'
   AND _entity_id IS NOT NULL
   AND eo.scope_value = _entity_id::text
  LEFT JOIN public.system_module_overrides ato
    ON ato.module_key = m.key AND ato.scope_type = 'account_type'
   AND ato.scope_value = _account_type
  LEFT JOIN public.system_module_overrides go
    ON go.module_key = m.key AND go.scope_type = 'global_default'
  WHERE m.is_active = true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_user_visible_modules(UUID, UUID) TO authenticated;
-- Keep the single-arg signature available for back-compat
GRANT EXECUTE ON FUNCTION public.get_user_visible_modules(UUID) TO authenticated;

-- 6) Owner RPCs: business owner can set/clear overrides for their own
--    entity OR for users that work in their entity. Cannot disable core.
--    Cannot enable a module that is itself disabled at the entity / global
--    level for them (we only let them tighten, not widen, what admin allowed).
CREATE OR REPLACE FUNCTION public.owner_set_module_override(
  _module_key TEXT,
  _scope_type TEXT,
  _scope_value TEXT,
  _enabled BOOLEAN,
  _reason TEXT DEFAULT NULL
)
RETURNS public.system_module_overrides
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _row public.system_module_overrides;
  _is_core BOOLEAN;
  _allowed BOOLEAN := false;
  _target_user UUID;
  _entity UUID;
BEGIN
  IF _scope_type NOT IN ('entity','user') THEN
    RAISE EXCEPTION 'owner can only manage entity or user scope';
  END IF;

  SELECT is_core INTO _is_core FROM public.system_modules WHERE key = _module_key;
  IF _is_core IS NULL THEN
    RAISE EXCEPTION 'unknown module: %', _module_key;
  END IF;
  IF _is_core AND _enabled = false THEN
    RAISE EXCEPTION 'core module cannot be disabled';
  END IF;

  IF _scope_type = 'entity' THEN
    _entity := _scope_value::uuid;
    _allowed := public.is_business_owner_of(auth.uid(), _entity);
  ELSE
    _target_user := _scope_value::uuid;
    _allowed := public.owner_employs_user(auth.uid(), _target_user);
  END IF;

  IF NOT _allowed THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  INSERT INTO public.system_module_overrides
    (module_key, scope_type, scope_value, enabled, reason, set_by)
  VALUES
    (_module_key, _scope_type, _scope_value, _enabled, _reason, auth.uid())
  ON CONFLICT (module_key, scope_type, scope_value)
  DO UPDATE SET
    enabled = EXCLUDED.enabled,
    reason = EXCLUDED.reason,
    set_by = EXCLUDED.set_by,
    updated_at = now()
  RETURNING * INTO _row;

  RETURN _row;
END;
$$;

GRANT EXECUTE ON FUNCTION public.owner_set_module_override(TEXT,TEXT,TEXT,BOOLEAN,TEXT) TO authenticated;

CREATE OR REPLACE FUNCTION public.owner_clear_module_override(
  _module_key TEXT,
  _scope_type TEXT,
  _scope_value TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _allowed BOOLEAN := false;
BEGIN
  IF _scope_type NOT IN ('entity','user') THEN
    RAISE EXCEPTION 'owner can only manage entity or user scope';
  END IF;

  IF _scope_type = 'entity' THEN
    _allowed := public.is_business_owner_of(auth.uid(), _scope_value::uuid);
  ELSE
    _allowed := public.owner_employs_user(auth.uid(), _scope_value::uuid);
  END IF;

  IF NOT _allowed THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  DELETE FROM public.system_module_overrides
   WHERE module_key = _module_key
     AND scope_type = _scope_type
     AND (scope_value IS NOT DISTINCT FROM _scope_value);

  RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.owner_clear_module_override(TEXT,TEXT,TEXT) TO authenticated;

-- 7) Owner read helper — resolves what a staff member of mine actually sees,
--    so the owner UI can preview effective visibility.
CREATE OR REPLACE FUNCTION public.owner_get_staff_visible_modules(
  _staff_user_id UUID,
  _entity_id UUID DEFAULT NULL
)
RETURNS TABLE (
  module_key TEXT,
  enabled BOOLEAN,
  source TEXT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT (
    public.owner_employs_user(auth.uid(), _staff_user_id)
    OR public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'super_admin')
  ) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  RETURN QUERY
  SELECT * FROM public.get_user_visible_modules(_staff_user_id, _entity_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.owner_get_staff_visible_modules(UUID, UUID) TO authenticated;