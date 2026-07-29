
-- Revoke token_hash column SELECT from client roles on customer_tracking_links
REVOKE SELECT (token_hash) ON public.customer_tracking_links FROM anon, authenticated;

-- Restrict permissions_catalog SELECT to admins
DROP POLICY IF EXISTS "perm catalog readable" ON public.permissions_catalog;
CREATE POLICY "perm catalog admin read" ON public.permissions_catalog
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

-- Restrict role_permissions SELECT to admins
DROP POLICY IF EXISTS "role perms readable" ON public.role_permissions;
CREATE POLICY "role perms admin read" ON public.role_permissions
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));
