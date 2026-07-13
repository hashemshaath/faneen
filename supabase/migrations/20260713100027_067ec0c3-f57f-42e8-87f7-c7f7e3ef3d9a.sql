
-- Fix 1: customer_tracking_links — hide token_hash from owner/manager SELECT
-- Revoke table-level SELECT, grant per-column SELECT excluding token_hash.
REVOKE SELECT ON public.customer_tracking_links FROM authenticated;
GRANT SELECT (id, ref_id, business_id, work_order_id, quotation_id, contract_id, customer_email, expires_at, revoked_at, created_by, created_at, last_viewed_at, view_count) ON public.customer_tracking_links TO authenticated;
-- service_role retains full access
GRANT ALL ON public.customer_tracking_links TO service_role;

-- Fix 2: images — restrict public SELECT (only owners can read rows; URLs remain public via storage bucket)
DROP POLICY IF EXISTS "Public read access to images" ON public.images;
CREATE POLICY "Owners can read their images"
  ON public.images
  FOR SELECT
  TO authenticated
  USING (auth.uid() = owner_id);
