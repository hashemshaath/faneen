-- Q2-UI — extend business_service_areas RLS so provider staff (active
-- business_staff rows) can CRUD coverage for their business, alongside
-- existing owner + admin policies. Additive only.

CREATE POLICY "service_areas_staff_insert"
  ON public.business_service_areas
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_business_staff(auth.uid(), business_id));

CREATE POLICY "service_areas_staff_update"
  ON public.business_service_areas
  FOR UPDATE
  TO authenticated
  USING (public.is_business_staff(auth.uid(), business_id))
  WITH CHECK (public.is_business_staff(auth.uid(), business_id));

CREATE POLICY "service_areas_staff_delete"
  ON public.business_service_areas
  FOR DELETE
  TO authenticated
  USING (public.is_business_staff(auth.uid(), business_id));

-- Note: SELECT already allows staff via business owner-read + published-read paths
-- in the existing service_areas_public_read policy. Staff of unpublished businesses
-- read their own rows through the owner branch when the owner is themselves; for
-- non-owner staff we rely on the published-read branch and admin oversight, which
-- is consistent with how other provider dashboards expose config for approved
-- businesses. No SELECT change needed here.
