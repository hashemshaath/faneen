-- Fix system-access visibility: grant Data API access to the catalog
-- + overrides tables, dedupe NULL-scope duplicates, and harden the
-- upsert RPCs against the NULL-not-equal-to-NULL unique gap.

-- 1. Grants. Catalog is safe to read for everyone (no PII).
GRANT SELECT ON public.system_modules TO anon, authenticated;
GRANT ALL ON public.system_modules TO service_role;

-- Overrides are read by admins (governance page) and by owners
-- indirectly via security-definer RPCs. Allow authenticated SELECT —
-- knowing which modules are toggled isn't sensitive, and RLS on the
-- table still restricts writes.
GRANT SELECT ON public.system_module_overrides TO authenticated;
GRANT ALL ON public.system_module_overrides TO service_role;

-- Audit log: admin-only via RLS, but allow authenticated SELECT so the
-- admin page can read it (the RLS policy already restricts to admins).
GRANT SELECT ON public.system_module_audit_log TO authenticated;
GRANT ALL ON public.system_module_audit_log TO service_role;

-- 2. De-duplicate any rows accidentally created when scope_value IS NULL
-- (Postgres UNIQUE treats NULLs as distinct, so global_default rows
-- could pile up). Keep the most recently updated row per module.
WITH ranked AS (
  SELECT id,
         row_number() OVER (
           PARTITION BY module_key, scope_type, COALESCE(scope_value, '__null__')
           ORDER BY updated_at DESC, created_at DESC
         ) AS rn
  FROM public.system_module_overrides
)
DELETE FROM public.system_module_overrides o
USING ranked r
WHERE o.id = r.id AND r.rn > 1;

-- 3. Replace the table-level unique constraint with a NULL-safe
-- expression index so the upsert ON CONFLICT clause can target it.
ALTER TABLE public.system_module_overrides
  DROP CONSTRAINT IF EXISTS system_module_overrides_module_key_scope_type_scope_value_key;

CREATE UNIQUE INDEX IF NOT EXISTS system_module_overrides_unique_scope
  ON public.system_module_overrides (
    module_key, scope_type, COALESCE(scope_value, '__null__')
  );

-- 4. Harden upsert RPCs to use the new NULL-safe index.
CREATE OR REPLACE FUNCTION public.admin_set_module_override(
  _module_key text, _scope_type text, _scope_value text,
  _enabled boolean, _reason text DEFAULT NULL
) RETURNS public.system_module_overrides
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  _row public.system_module_overrides;
  _is_core BOOLEAN;
BEGIN
  IF NOT (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin')) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  SELECT is_core INTO _is_core FROM public.system_modules WHERE key = _module_key;
  IF _is_core IS NULL THEN RAISE EXCEPTION 'unknown module: %', _module_key; END IF;
  IF _is_core AND _enabled = false THEN RAISE EXCEPTION 'core module cannot be disabled'; END IF;

  INSERT INTO public.system_module_overrides
    (module_key, scope_type, scope_value, enabled, reason, set_by)
  VALUES (_module_key, _scope_type, _scope_value, _enabled, _reason, auth.uid())
  ON CONFLICT (module_key, scope_type, COALESCE(scope_value, '__null__'))
  DO UPDATE SET
    enabled = EXCLUDED.enabled,
    reason = EXCLUDED.reason,
    set_by = EXCLUDED.set_by,
    updated_at = now()
  RETURNING * INTO _row;
  RETURN _row;
END;
$$;

CREATE OR REPLACE FUNCTION public.owner_set_module_override(
  _module_key text, _scope_type text, _scope_value text,
  _enabled boolean, _reason text DEFAULT NULL
) RETURNS public.system_module_overrides
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  _row public.system_module_overrides;
  _is_core BOOLEAN;
  _allowed BOOLEAN := false;
BEGIN
  IF _scope_type NOT IN ('entity','user') THEN
    RAISE EXCEPTION 'owner_set_module_override: invalid scope';
  END IF;
  SELECT is_core INTO _is_core FROM public.system_modules WHERE key = _module_key;
  IF _is_core IS NULL THEN RAISE EXCEPTION 'unknown module: %', _module_key; END IF;
  IF _is_core AND _enabled = false THEN RAISE EXCEPTION 'core module cannot be disabled'; END IF;

  -- Owner / admin authorization.
  IF public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin') THEN
    _allowed := true;
  ELSIF _scope_type = 'entity' THEN
    SELECT EXISTS (
      SELECT 1 FROM public.businesses
      WHERE id = _scope_value::uuid AND user_id = auth.uid()
    ) INTO _allowed;
  ELSIF _scope_type = 'user' THEN
    SELECT EXISTS (
      SELECT 1 FROM public.business_staff bs
      JOIN public.businesses b ON b.id = bs.business_id
      WHERE bs.user_id = _scope_value::uuid AND b.user_id = auth.uid()
    ) INTO _allowed;
  END IF;
  IF NOT _allowed THEN RAISE EXCEPTION 'forbidden'; END IF;

  INSERT INTO public.system_module_overrides
    (module_key, scope_type, scope_value, enabled, reason, set_by)
  VALUES (_module_key, _scope_type, _scope_value, _enabled, _reason, auth.uid())
  ON CONFLICT (module_key, scope_type, COALESCE(scope_value, '__null__'))
  DO UPDATE SET
    enabled = EXCLUDED.enabled,
    reason = EXCLUDED.reason,
    set_by = EXCLUDED.set_by,
    updated_at = now()
  RETURNING * INTO _row;
  RETURN _row;
END;
$$;