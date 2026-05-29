-- Tighten public visibility of promotions: only active promotions whose
-- linked business is approved AND active are visible publicly. Business
-- owners keep visibility of their own promotions regardless of approval
-- so the dashboard continues to work for draft businesses.

DROP POLICY IF EXISTS "Anyone can view active promotions" ON public.promotions;

CREATE POLICY "Public can view active promotions of approved businesses"
  ON public.promotions
  FOR SELECT
  USING (
    is_active = true
    AND EXISTS (
      SELECT 1
      FROM public.businesses b
      WHERE b.id = promotions.business_id
        AND b.approval_status = 'approved'
        AND b.is_active = true
    )
  );

CREATE POLICY "Business owners can view their own promotions"
  ON public.promotions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.businesses b
      WHERE b.id = promotions.business_id
        AND b.user_id = auth.uid()
    )
  );