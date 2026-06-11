
CREATE TABLE IF NOT EXISTS public.business_service_brand_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_brand_link_id uuid NOT NULL REFERENCES public.business_service_brands(id) ON DELETE CASCADE,
  brand_product_id uuid NOT NULL REFERENCES public.brand_products(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  brand_id uuid NOT NULL REFERENCES public.brand_catalog(id) ON DELETE CASCADE,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (provider_brand_link_id, brand_product_id)
);

CREATE INDEX IF NOT EXISTS idx_bsbp_link ON public.business_service_brand_products(provider_brand_link_id);
CREATE INDEX IF NOT EXISTS idx_bsbp_product ON public.business_service_brand_products(brand_product_id);
CREATE INDEX IF NOT EXISTS idx_bsbp_business ON public.business_service_brand_products(business_id);
CREATE INDEX IF NOT EXISTS idx_bsbp_brand ON public.business_service_brand_products(brand_id);

GRANT SELECT ON public.business_service_brand_products TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.business_service_brand_products TO authenticated;
GRANT ALL ON public.business_service_brand_products TO service_role;

ALTER TABLE public.business_service_brand_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "bsbp_public_read"
ON public.business_service_brand_products
FOR SELECT
USING (true);

CREATE POLICY "bsbp_admin_all"
ON public.business_service_brand_products
FOR ALL
TO authenticated
USING (public.has_admin_access(auth.uid()))
WITH CHECK (public.has_admin_access(auth.uid()));

CREATE POLICY "bsbp_owner_write"
ON public.business_service_brand_products
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.businesses b
    WHERE b.id = business_service_brand_products.business_id
      AND b.user_id = auth.uid()
  )
  OR public.is_business_staff(auth.uid(), business_service_brand_products.business_id)
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.businesses b
    WHERE b.id = business_service_brand_products.business_id
      AND b.user_id = auth.uid()
  )
  OR public.is_business_staff(auth.uid(), business_service_brand_products.business_id)
);
