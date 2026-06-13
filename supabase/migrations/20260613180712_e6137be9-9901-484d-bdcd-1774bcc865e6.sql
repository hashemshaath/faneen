-- Fix infinite recursion between businesses ↔ business_staff RLS policies.
-- The "Managers read assigned business rows" SELECT policy on public.businesses
-- subqueried public.business_staff, whose own SELECT policy subqueries
-- public.businesses → cycle → "infinite recursion detected in policy" (500).
-- Replace the subquery with the existing SECURITY DEFINER helper
-- public.is_business_owner_or_manager(uuid, uuid).

DROP POLICY IF EXISTS "Managers read assigned business rows" ON public.businesses;

CREATE POLICY "Managers read assigned business rows"
  ON public.businesses
  FOR SELECT
  USING (public.is_business_owner_or_manager(auth.uid(), id));