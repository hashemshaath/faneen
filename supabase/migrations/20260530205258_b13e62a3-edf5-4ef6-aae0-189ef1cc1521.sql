-- BRANDS-GOVERNANCE-2 Phase A: tighten RLS and add updated_at triggers.

-- 1. brand_catalog: hide non-approved rows from public; admins still see all.
DROP POLICY IF EXISTS brand_catalog_select_public ON public.brand_catalog;
CREATE POLICY brand_catalog_select_public
  ON public.brand_catalog
  FOR SELECT
  TO public
  USING (status = 'approved' OR public.has_admin_access(auth.uid()));

-- 2. business_service_brands: only expose links to approved brands publicly.
--    Owners and admins keep full visibility (handled by existing bsb_owner_write
--    policy for ALL, but read needs an extra clause).
DROP POLICY IF EXISTS bsb_select_public ON public.business_service_brands;
CREATE POLICY bsb_select_public
  ON public.business_service_brands
  FOR SELECT
  TO public
  USING (
    EXISTS (
      SELECT 1 FROM public.brand_catalog b
      WHERE b.id = business_service_brands.brand_id
        AND b.status = 'approved'
    )
    OR (
      auth.uid() IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.businesses bz
        WHERE bz.id = business_service_brands.business_id
          AND bz.user_id = auth.uid()
      )
    )
    OR public.has_admin_access(auth.uid())
  );

-- 3. brand_addition_requests: allow user-only submissions (no business required)
--    while still preventing impersonation of other businesses.
DROP POLICY IF EXISTS brr_insert_owner ON public.brand_addition_requests;
CREATE POLICY brr_insert_owner
  ON public.brand_addition_requests
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND (
      business_id IS NULL
      OR EXISTS (
        SELECT 1 FROM public.businesses b
        WHERE b.id = brand_addition_requests.business_id
          AND b.user_id = auth.uid()
      )
    )
  );

-- 4. updated_at triggers on tables that carry the column.
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['brand_catalog','brand_addition_requests','business_service_brands','sectors'] LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_%I_updated_at ON public.%I', t, t);
    EXECUTE format(
      'CREATE TRIGGER trg_%I_updated_at BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column()',
      t, t
    );
  END LOOP;
END $$;