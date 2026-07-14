
-- =====================================================================
-- M6 RBAC HARDENING — surgical policy + RPC tightening
-- =====================================================================
-- Bootstrap semantics: every super-admin-only guard below allows the
-- action when NO super_admin row exists yet (prevents lockout). Since a
-- super_admin already exists today (1 row), the guards activate now.
-- =====================================================================

-- Helper: fail-safe super_admin requirement.
CREATE OR REPLACE FUNCTION public.require_super_admin_or_bootstrap(_user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    public.is_super_admin(_user_id)
    OR NOT EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'super_admin');
$$;

GRANT EXECUTE ON FUNCTION public.require_super_admin_or_bootstrap(uuid) TO authenticated, anon;

-- ---------------------------------------------------------------------
-- M6.1a — membership_plans: only super_admin can create/edit/delete
-- ---------------------------------------------------------------------
DROP POLICY IF EXISTS "Admins can manage plans" ON public.membership_plans;

CREATE POLICY "Super admins can manage plans"
  ON public.membership_plans
  FOR ALL
  USING (public.require_super_admin_or_bootstrap(auth.uid()))
  WITH CHECK (public.require_super_admin_or_bootstrap(auth.uid()));

-- ---------------------------------------------------------------------
-- M6.1b — platform_settings: super_admin required for sensitive
-- categories (billing, security, payments, api_keys). Regular admins
-- retain read + management of other categories.
-- ---------------------------------------------------------------------
DROP POLICY IF EXISTS "Admins can insert settings" ON public.platform_settings;
DROP POLICY IF EXISTS "Admins can update settings" ON public.platform_settings;
DROP POLICY IF EXISTS "Admins can delete settings" ON public.platform_settings;

CREATE POLICY "Sensitive settings super_admin only (insert)"
  ON public.platform_settings
  FOR INSERT
  WITH CHECK (
    public.has_admin_access(auth.uid())
    AND (
      COALESCE(category,'') NOT IN ('billing','security','payments','api_keys')
      OR public.require_super_admin_or_bootstrap(auth.uid())
    )
  );

CREATE POLICY "Sensitive settings super_admin only (update)"
  ON public.platform_settings
  FOR UPDATE
  USING (
    public.has_admin_access(auth.uid())
    AND (
      COALESCE(category,'') NOT IN ('billing','security','payments','api_keys')
      OR public.require_super_admin_or_bootstrap(auth.uid())
    )
  )
  WITH CHECK (
    public.has_admin_access(auth.uid())
    AND (
      COALESCE(category,'') NOT IN ('billing','security','payments','api_keys')
      OR public.require_super_admin_or_bootstrap(auth.uid())
    )
  );

CREATE POLICY "Sensitive settings super_admin only (delete)"
  ON public.platform_settings
  FOR DELETE
  USING (
    public.has_admin_access(auth.uid())
    AND (
      COALESCE(category,'') NOT IN ('billing','security','payments','api_keys')
      OR public.require_super_admin_or_bootstrap(auth.uid())
    )
  );

-- ---------------------------------------------------------------------
-- M6.1c — system_module_overrides: writes go through the SECURITY
-- DEFINER RPCs (already super_admin-gated). The table RLS is tightened
-- so direct table writes also require super_admin — prevents a plain
-- admin from bypassing the RPCs via a raw insert.
-- ---------------------------------------------------------------------
DROP POLICY IF EXISTS "sysmod_overrides admin manage" ON public.system_module_overrides;

CREATE POLICY "sysmod_overrides super_admin manage"
  ON public.system_module_overrides
  FOR ALL
  USING (public.require_super_admin_or_bootstrap(auth.uid()))
  WITH CHECK (public.require_super_admin_or_bootstrap(auth.uid()));

-- ---------------------------------------------------------------------
-- M6.2 — Mandatory reason on admin_set_module_override.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_set_module_override(
  _module_key text,
  _scope_type text,
  _scope_value text,
  _enabled boolean,
  _reason text DEFAULT NULL::text
)
RETURNS public.system_module_overrides
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  _row public.system_module_overrides;
  _is_core BOOLEAN;
BEGIN
  IF NOT public.has_role(auth.uid(), 'super_admin') THEN
    RAISE EXCEPTION 'forbidden: super_admin required' USING ERRCODE = '42501';
  END IF;

  -- M6.2: reason is now mandatory for accountability in audit log.
  IF _reason IS NULL OR length(btrim(_reason)) = 0 THEN
    RAISE EXCEPTION 'reason required for module override (M6.2)' USING ERRCODE = '22023';
  END IF;

  SELECT is_core INTO _is_core FROM public.system_modules WHERE key = _module_key;
  IF _is_core IS NULL THEN RAISE EXCEPTION 'unknown module: %', _module_key; END IF;
  IF _is_core AND _enabled = false THEN RAISE EXCEPTION 'core module cannot be disabled'; END IF;

  INSERT INTO public.system_module_overrides
    (module_key, scope_type, scope_value, enabled, reason, set_by)
  VALUES (_module_key, _scope_type, _scope_value, _enabled, btrim(_reason), auth.uid())
  ON CONFLICT (module_key, scope_type, COALESCE(scope_value, '__null__'))
  DO UPDATE SET
    enabled = EXCLUDED.enabled,
    reason  = EXCLUDED.reason,
    set_by  = EXCLUDED.set_by,
    updated_at = now()
  RETURNING * INTO _row;

  BEGIN
    INSERT INTO public.admin_activity_log (user_id, action, entity_type, details)
    VALUES (
      auth.uid(),
      'set_module_override',
      'system_module',
      jsonb_build_object(
        'module_key', _module_key,
        'scope_type', _scope_type,
        'scope_value', _scope_value,
        'enabled', _enabled,
        'reason', btrim(_reason)
      )
    );
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  RETURN _row;
END;
$function$;

-- ---------------------------------------------------------------------
-- M6.2 helper — plan-mismatch check for the admin UI warning tag.
-- Returns TRUE when the module is NOT included in the business's
-- currently active membership plan (so the admin UI can show a
-- «تجاوز لباقة العضوية» warning). Never blocks — warn-only.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.business_is_missing_plan_module(
  _business_id uuid,
  _module_key text
)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT NOT EXISTS (
    SELECT 1
    FROM public.membership_subscriptions ms
    JOIN public.membership_plan_modules mpm
      ON mpm.plan_id = ms.plan_id
    WHERE ms.business_id = _business_id
      AND ms.status IN ('active','trialing','past_due')
      AND mpm.module_key = _module_key
      AND mpm.enabled = true
  );
$$;

GRANT EXECUTE ON FUNCTION public.business_is_missing_plan_module(uuid, text) TO authenticated;
