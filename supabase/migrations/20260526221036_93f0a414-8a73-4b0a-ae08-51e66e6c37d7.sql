-- SUPABASE-LINTER-HARDENING-4
-- `public.auth_temporary_login_codes` stores hashed one-time login codes and
-- is accessed exclusively through SECURITY DEFINER RPCs. The original
-- migration revoked all grants from PUBLIC/anon/authenticated and enabled
-- RLS as defense-in-depth. With no policy attached, RLS implicitly denies
-- all direct access, but linter 0008 cannot tell that from a missing-policy
-- mistake. Make the intent explicit with a deny-all policy so the design
-- pattern is auditable and the warning clears.
--
-- Behavior impact: none.
--   * REVOKE already prevents the Data API from reaching the table.
--   * SECURITY DEFINER RPCs (issue/consume login code) bypass RLS as the
--     function owner, so they continue to work.

CREATE POLICY "Deny all direct client access"
ON public.auth_temporary_login_codes
FOR ALL
TO public
USING (false)
WITH CHECK (false);
