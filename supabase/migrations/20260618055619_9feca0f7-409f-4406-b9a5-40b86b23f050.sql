-- Fix 1: business_services public read must require approved + active + non-demo business
DROP POLICY IF EXISTS "Public can view active allowed services" ON public.business_services;
CREATE POLICY "Public can view active allowed services"
ON public.business_services
FOR SELECT
USING (
  is_active = true
  AND provider_status = 'active'::text
  AND admin_status = 'allowed'::text
  AND EXISTS (
    SELECT 1 FROM public.businesses b
    WHERE b.id = business_services.business_id
      AND b.approval_status = 'published'::business_approval_status
      AND COALESCE(b.is_active, true) = true
      AND COALESCE(b.is_demo, false) = false
  )
);

-- Fix 2: business_service_brand_products public read must require approved + non-demo business
DROP POLICY IF EXISTS bsbp_public_read ON public.business_service_brand_products;
CREATE POLICY bsbp_public_read
ON public.business_service_brand_products
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.businesses b
    WHERE b.id = business_service_brand_products.business_id
      AND b.approval_status = 'published'::business_approval_status
      AND COALESCE(b.is_active, true) = true
      AND COALESCE(b.is_demo, false) = false
  )
  OR (
    auth.uid() IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.businesses bz
      WHERE bz.id = business_service_brand_products.business_id
        AND bz.user_id = auth.uid()
    )
  )
  OR public.has_admin_access(auth.uid())
);