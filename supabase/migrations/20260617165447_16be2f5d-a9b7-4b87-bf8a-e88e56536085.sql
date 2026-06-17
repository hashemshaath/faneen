-- Restrict business_service_areas public read to published/active/non-demo businesses
DROP POLICY IF EXISTS service_areas_public_read ON public.business_service_areas;
CREATE POLICY service_areas_public_read
ON public.business_service_areas
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.businesses b
    WHERE b.id = business_service_areas.business_id
      AND b.is_active = true
      AND b.approval_status = 'published'
      AND b.is_demo = false
  )
  OR EXISTS (
    SELECT 1 FROM public.businesses b
    WHERE b.id = business_service_areas.business_id
      AND b.user_id = auth.uid()
  )
  OR public.has_admin_access(auth.uid())
);

-- Restrict provider_installment_settings to owners/staff/admins (remove blanket authenticated read)
DROP POLICY IF EXISTS "Authenticated users can view provider installment settings" ON public.provider_installment_settings;
CREATE POLICY "Owners staff and admins read installment settings"
ON public.provider_installment_settings
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.businesses b
    WHERE b.id = provider_installment_settings.business_id
      AND b.user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM public.business_staff s
    WHERE s.business_id = provider_installment_settings.business_id
      AND s.user_id = auth.uid()
      AND s.is_active = true
  )
  OR public.has_admin_access(auth.uid())
);