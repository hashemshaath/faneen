-- Fix infinite recursion between businesses ↔ business_staff RLS policies.
-- The previous "Managers read assigned business rows" policy subqueries
-- business_staff, whose own SELECT policy subqueries businesses, producing
-- "infinite recursion detected in policy" (500) errors on every authenticated
-- read of businesses. Replace the subquery with the existing SECURITY DEFINER
-- helper public.is_business_owner_or_manager(uuid, uuid).

DROP POLICY IF EXISTS "Managers read assigned business rows" ON public.businesses;

CREATE POLICY "Managers read assigned business rows"
  ON public.businesses
  FOR SELECT
  USING (public.is_business_owner_or_manager(auth.uid(), id));
