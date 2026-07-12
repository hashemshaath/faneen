-- FIX 1 — business_service_brands public leak.
-- Replace bsb_select_public: require the business to be published & active & non-demo
-- on the public branch, matching the pattern used on business_service_brand_products
-- and business_service_taxonomy_categories.
DROP POLICY IF EXISTS "bsb_select_public" ON public.business_service_brands;

CREATE POLICY "bsb_select_public"
  ON public.business_service_brands
  FOR SELECT
  USING (
    -- Public branch: only when linked business is fully live AND the brand is approved.
    (
      EXISTS (
        SELECT 1 FROM public.brand_catalog b
         WHERE b.id = business_service_brands.brand_id
           AND b.status = 'approved'
      )
      AND EXISTS (
        SELECT 1 FROM public.businesses bz
         WHERE bz.id = business_service_brands.business_id
           AND bz.is_active = true
           AND bz.approval_status = 'published'::business_approval_status
           AND bz.is_demo = false
      )
    )
    -- Owner branch: business owner sees own rows regardless of publish state.
    OR (
      auth.uid() IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM public.businesses bz
         WHERE bz.id = business_service_brands.business_id
           AND bz.user_id = auth.uid()
      )
    )
    -- Admin branch.
    OR public.has_admin_access(auth.uid())
  );

-- FIX 2 — provider_lead_docs_token_insert: drop the public INSERT path.
-- Client-generated random tokens never matched an existing provider_leads.id
-- anyway, so this policy was effectively unused for legitimate flows AND
-- exposed a "guess a recent lead id" write surface. Public uploads now go
-- through the `upload-provider-lead-doc` edge function using the service role,
-- which validates size/mime server-side.
DROP POLICY IF EXISTS "provider_lead_docs_token_insert" ON storage.objects;
