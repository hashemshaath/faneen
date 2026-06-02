CREATE OR REPLACE VIEW public.businesses_public AS
SELECT
  id,
  business_number,
  name_ar,
  name_en,
  username,
  ref_id,
  category_id,
  city_id,
  country_id,
  description_ar,
  description_en,
  short_description_ar,
  short_description_en,
  logo_url,
  cover_url,
  address,
  district,
  region,
  street_name,
  latitude,
  longitude,
  website,
  rating_avg,
  rating_count,
  membership_tier,
  is_active,
  is_verified,
  created_at,
  updated_at,
  user_id,
  approval_status
FROM public.businesses
WHERE is_active = true
  AND approval_status = 'published'::public.business_approval_status
  AND is_demo = false;

ALTER VIEW public.businesses_public SET (security_invoker = off);
GRANT SELECT ON public.businesses_public TO anon, authenticated;