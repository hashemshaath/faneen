CREATE OR REPLACE FUNCTION public.is_public_business_profile(_business_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.businesses b
    WHERE b.id = _business_id
      AND b.is_active = true
      AND b.approval_status = 'published'::public.business_approval_status
      AND COALESCE(b.is_demo, false) = false
  );
$$;

REVOKE ALL ON FUNCTION public.is_public_business_profile(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_public_business_profile(uuid) TO anon, authenticated, service_role;

DROP POLICY IF EXISTS "Public can read links for visible businesses" ON public.business_taxonomy_categories;
CREATE POLICY "Public can read links for visible businesses"
ON public.business_taxonomy_categories
FOR SELECT
TO anon, authenticated
USING (public.is_public_business_profile(business_id));