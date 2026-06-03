
-- 1) contact_inbox_settings: restrict SELECT to super_admin only (webhook secret protection)
DROP POLICY IF EXISTS "Admins read inbox settings" ON public.contact_inbox_settings;
CREATE POLICY "Super admins read inbox settings"
ON public.contact_inbox_settings
FOR SELECT
USING (public.has_role(auth.uid(), 'super_admin'::public.app_role));

-- 2) businesses: restrict full-row read to owner / manager / admin (remove blanket viewer-staff read)
DROP POLICY IF EXISTS "Authenticated members can read full business rows" ON public.businesses;
CREATE POLICY "Owners managers and admins read full business rows"
ON public.businesses
FOR SELECT
USING (
  auth.uid() = user_id
  OR public.is_business_owner_or_manager(auth.uid(), id)
  OR public.has_admin_access(auth.uid())
);

-- 3) customer_project_notifications: drop viewer-staff PII access
DROP POLICY IF EXISTS "cpn_staff_select" ON public.customer_project_notifications;
DROP POLICY IF EXISTS "cpn_owner_select" ON public.customer_project_notifications;
CREATE POLICY "cpn_owner_manager_select"
ON public.customer_project_notifications
FOR SELECT
USING (
  public.is_business_owner_or_manager(auth.uid(), business_id)
  OR public.has_admin_access(auth.uid())
);

-- 4) customer_tracking_links: restrict to owner/manager/admin
DROP POLICY IF EXISTS "ctl_owner_select" ON public.customer_tracking_links;
CREATE POLICY "ctl_owner_manager_select"
ON public.customer_tracking_links
FOR SELECT
USING (
  public.is_business_owner_or_manager(auth.uid(), business_id)
  OR public.has_admin_access(auth.uid())
);

-- 5) work_orders: restrict SELECT to owner/manager (PII: customer_phone) + admins
DROP POLICY IF EXISTS "wo_select_member" ON public.work_orders;
CREATE POLICY "wo_select_owner_manager"
ON public.work_orders
FOR SELECT
USING (
  deleted_at IS NULL
  AND (
    public.is_business_owner_or_manager(auth.uid(), business_id)
    OR public.has_admin_access(auth.uid())
  )
);
