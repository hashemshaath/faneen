-- Tighten system_module_overrides SELECT policies.
-- Consolidate the two duplicate SELECT policies into a single strict policy
-- that limits rows to those literally matching the caller's own scope, so
-- authenticated users cannot probe scope_value across scope_types.

DROP POLICY IF EXISTS "sysmod_overrides self read" ON public.system_module_overrides;
DROP POLICY IF EXISTS "system_module_overrides_select_self" ON public.system_module_overrides;

CREATE POLICY "sysmod_overrides strict self read"
  ON public.system_module_overrides
  FOR SELECT
  TO authenticated
  USING (
    -- Admins and super_admins see everything
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'super_admin'::app_role)
    -- Everyone can see the global default rows
    OR (scope_type = 'global_default'::text)
    -- Own user row only
    OR (scope_type = 'user'::text AND scope_value = (auth.uid())::text)
    -- Own account_type only (strict equality against the caller's profile)
    OR (
      scope_type = 'account_type'::text
      AND scope_value = (
        SELECT (profiles.account_type)::text
        FROM profiles
        WHERE profiles.user_id = auth.uid()
        LIMIT 1
      )
    )
    -- Entity rows only for entities the caller owns or is staff of
    OR (
      scope_type = 'entity'::text
      AND (
        is_business_owner_of(auth.uid(), (scope_value)::uuid)
        OR EXISTS (
          SELECT 1 FROM business_staff
          WHERE business_staff.business_id = (system_module_overrides.scope_value)::uuid
            AND business_staff.user_id = auth.uid()
        )
      )
    )
  );