DROP VIEW IF EXISTS public.business_branches_public;
CREATE VIEW public.business_branches_public
WITH (security_invoker=on) AS
SELECT
  id, business_id, name_ar, name_en, slug,
  address, district, region, street_name, building_number,
  city_id, country_id,
  phone, mobile, customer_service_phone, unified_number, website,
  latitude, longitude,
  is_active, is_main, sort_order, created_at
FROM public.business_branches b
WHERE is_active = true
  AND EXISTS (
    SELECT 1 FROM public.businesses parent
    WHERE parent.id = b.business_id
      AND parent.is_active = true
      AND parent.approval_status = 'published'::business_approval_status
      AND parent.is_demo = false
  );

GRANT SELECT ON public.business_branches_public TO anon, authenticated;