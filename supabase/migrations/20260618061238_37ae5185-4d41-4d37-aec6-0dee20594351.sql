-- PUBLIC WORKING HOURS VIEW EXPOSURE
-- Add `working_hours` (jsonb) to public.business_branches_public.
-- No new sensitive fields; same filter (active + parent published & active & not demo).
-- Keep security_invoker = on so RLS on business_branches remains authoritative.

DROP VIEW IF EXISTS public.business_branches_public;

CREATE VIEW public.business_branches_public AS
SELECT
  id,
  business_id,
  name_ar,
  name_en,
  slug,
  address,
  district,
  region,
  street_name,
  building_number,
  city_id,
  country_id,
  phone,
  mobile,
  customer_service_phone,
  unified_number,
  website,
  latitude,
  longitude,
  working_hours,
  is_active,
  is_main,
  sort_order,
  created_at
FROM public.business_branches b
WHERE is_active = true
  AND EXISTS (
    SELECT 1
    FROM public.businesses parent
    WHERE parent.id = b.business_id
      AND parent.is_active = true
      AND parent.approval_status = 'published'::business_approval_status
      AND parent.is_demo = false
  );

ALTER VIEW public.business_branches_public SET (security_invoker = on);

GRANT SELECT ON public.business_branches_public TO anon, authenticated;