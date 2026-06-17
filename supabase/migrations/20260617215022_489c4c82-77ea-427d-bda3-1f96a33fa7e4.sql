DROP POLICY IF EXISTS bsbp_public_read ON public.business_service_brand_products;

CREATE POLICY bsbp_public_read
ON public.business_service_brand_products
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.businesses b
    WHERE b.id = business_service_brand_products.business_id
      AND COALESCE(b.is_active, true) = true
  )
  OR (auth.uid() IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.businesses bz
    WHERE bz.id = business_service_brand_products.business_id
      AND bz.user_id = auth.uid()
  ))
  OR has_admin_access(auth.uid())
);

DROP POLICY IF EXISTS "btp owner_staff_admin select" ON public.business_tax_profiles;

CREATE POLICY "btp owner_manager_admin select"
ON public.business_tax_profiles
FOR SELECT
USING (
  is_business_owner_or_manager(auth.uid(), business_id)
  OR has_admin_access(auth.uid())
);