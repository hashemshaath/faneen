-- MEMBERSHIP-SYSTEM-ACCESS-GOVERNANCE-1

-- 1. Plan ↔ Module matrix
CREATE TABLE IF NOT EXISTS public.membership_plan_modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES public.membership_plans(id) ON DELETE CASCADE,
  module_key TEXT NOT NULL REFERENCES public.system_modules(key) ON DELETE CASCADE,
  enabled BOOLEAN NOT NULL DEFAULT true,
  set_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (plan_id, module_key)
);

CREATE INDEX IF NOT EXISTS idx_mpm_plan ON public.membership_plan_modules(plan_id);
CREATE INDEX IF NOT EXISTS idx_mpm_module ON public.membership_plan_modules(module_key);

GRANT SELECT ON public.membership_plan_modules TO authenticated;
GRANT ALL ON public.membership_plan_modules TO service_role;

ALTER TABLE public.membership_plan_modules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "mpm_read_authenticated"
  ON public.membership_plan_modules FOR SELECT
  TO authenticated USING (true);

-- Writes are funnelled through the super-admin RPC only (no direct INSERT/UPDATE/DELETE policy).

-- 2. Super-admin-only per-business module override (audited via existing trigger).
CREATE OR REPLACE FUNCTION public.super_admin_set_business_module_override(
  _business_id UUID,
  _module_key TEXT,
  _enabled BOOLEAN,
  _reason TEXT
) RETURNS public.system_module_overrides
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _row public.system_module_overrides;
  _is_core BOOLEAN;
BEGIN
  IF NOT public.is_super_admin(auth.uid()) THEN
    RAISE EXCEPTION 'forbidden: super_admin required';
  END IF;
  IF _business_id IS NULL THEN RAISE EXCEPTION 'business_id required'; END IF;
  IF _reason IS NULL OR length(btrim(_reason)) = 0 THEN
    RAISE EXCEPTION 'reason required for super-admin override';
  END IF;
  SELECT is_core INTO _is_core FROM public.system_modules WHERE key = _module_key;
  IF _is_core IS NULL THEN RAISE EXCEPTION 'unknown module: %', _module_key; END IF;
  IF _is_core AND _enabled = false THEN RAISE EXCEPTION 'core module cannot be disabled'; END IF;

  INSERT INTO public.system_module_overrides
    (module_key, scope_type, scope_value, enabled, reason, set_by)
  VALUES (_module_key, 'entity', _business_id::text, _enabled, _reason, auth.uid())
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

REVOKE ALL ON FUNCTION public.super_admin_set_business_module_override(UUID,TEXT,BOOLEAN,TEXT) FROM public;
GRANT EXECUTE ON FUNCTION public.super_admin_set_business_module_override(UUID,TEXT,BOOLEAN,TEXT) TO authenticated;

-- 3. Super-admin-only plan/module toggle (writes audit entry).
CREATE OR REPLACE FUNCTION public.super_admin_set_membership_plan_module(
  _plan_id UUID,
  _module_key TEXT,
  _enabled BOOLEAN
) RETURNS public.membership_plan_modules
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _row public.membership_plan_modules;
  _previous BOOLEAN;
BEGIN
  IF NOT public.is_super_admin(auth.uid()) THEN
    RAISE EXCEPTION 'forbidden: super_admin required';
  END IF;
  IF _plan_id IS NULL THEN RAISE EXCEPTION 'plan_id required'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.system_modules WHERE key = _module_key) THEN
    RAISE EXCEPTION 'unknown module: %', _module_key;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.membership_plans WHERE id = _plan_id) THEN
    RAISE EXCEPTION 'unknown plan: %', _plan_id;
  END IF;

  SELECT enabled INTO _previous FROM public.membership_plan_modules
    WHERE plan_id = _plan_id AND module_key = _module_key;

  INSERT INTO public.membership_plan_modules (plan_id, module_key, enabled, set_by)
  VALUES (_plan_id, _module_key, _enabled, auth.uid())
  ON CONFLICT (plan_id, module_key) DO UPDATE
  SET enabled = EXCLUDED.enabled, set_by = EXCLUDED.set_by, updated_at = now()
  RETURNING * INTO _row;

  -- Trace through existing module audit log (scope='account_type' = plan tier mapping).
  INSERT INTO public.system_module_audit_log
    (action, module_key, scope_type, scope_value, previous_enabled, new_enabled, reason, actor)
  VALUES (
    CASE WHEN _previous IS NULL THEN 'grant'
         WHEN _previous = _enabled THEN 'update'
         WHEN _enabled THEN 'grant' ELSE 'revoke' END,
    _module_key, 'account_type', 'plan:' || _plan_id::text,
    _previous, _enabled,
    'membership plan module governance', auth.uid()
  );
  RETURN _row;
END;
$$;

REVOKE ALL ON FUNCTION public.super_admin_set_membership_plan_module(UUID,TEXT,BOOLEAN) FROM public;
GRANT EXECUTE ON FUNCTION public.super_admin_set_membership_plan_module(UUID,TEXT,BOOLEAN) TO authenticated;

-- 4. Read helper: return every module for a plan with its enabled flag (defaults to false when no row).
CREATE OR REPLACE FUNCTION public.list_membership_plan_modules(_plan_id UUID)
RETURNS TABLE (module_key TEXT, label_ar TEXT, label_en TEXT, category TEXT, is_core BOOLEAN, enabled BOOLEAN)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    sm.key, sm.label_ar, sm.label_en, sm.category::text, sm.is_core,
    COALESCE(mpm.enabled, sm.is_core OR sm.default_enabled) AS enabled
  FROM public.system_modules sm
  LEFT JOIN public.membership_plan_modules mpm
    ON mpm.module_key = sm.key AND mpm.plan_id = _plan_id
  WHERE sm.is_active = true
  ORDER BY sm.sort_order;
$$;

GRANT EXECUTE ON FUNCTION public.list_membership_plan_modules(UUID) TO authenticated;