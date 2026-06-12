-- Remove user_id from businesses_public (PII leak fix).
-- Postgres CREATE OR REPLACE VIEW cannot drop columns, so we drop and recreate.
-- category_public_counts depends on businesses_public; recreate it unchanged.

DROP VIEW IF EXISTS public.category_public_counts;
DROP VIEW IF EXISTS public.businesses_public;

CREATE VIEW public.businesses_public AS
SELECT
  id,
  business_number,
  name_ar,
  name_en,
  username,
  ref_id,
  city_id,
  country_id,
  description_ar,
  description_en,
  short_description_ar,
  short_description_en,
  logo_url,
  cover_url,
  logo_image_asset_id,
  cover_image_asset_id,
  logo_image_variants,
  cover_image_variants,
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
  approval_status
FROM public.businesses
WHERE is_active = true
  AND approval_status = 'published'::business_approval_status
  AND is_demo = false;

GRANT SELECT ON public.businesses_public TO anon, authenticated, service_role;

CREATE VIEW public.category_public_counts AS
WITH rollup AS (
  SELECT tc_1.id AS category_id,
    ARRAY(
      SELECT child.id
      FROM public.taxonomy_categories child
      WHERE child.is_active = true
        AND child.is_public = true
        AND (child.id = tc_1.id OR child.parent_id = tc_1.id)
    ) AS ids
  FROM public.taxonomy_categories tc_1
  WHERE tc_1.is_active = true AND tc_1.is_public = true
)
SELECT
  tc.id AS category_id,
  tc.slug,
  tc.name_ar,
  tc.name_en,
  tc.parent_id,
  (SELECT count(DISTINCT bp.id)
     FROM public.business_taxonomy_categories btc
     JOIN public.businesses_public bp ON bp.id = btc.business_id
    WHERE btc.category_id = ANY (r.ids)) AS providers_count,
  (SELECT count(*)
     FROM public.business_service_taxonomy_categories bstc
     JOIN public.business_services bs ON bs.id = bstc.service_id
     JOIN public.businesses_public bp ON bp.id = bs.business_id
    WHERE bstc.category_id = ANY (r.ids)) AS services_count,
  (SELECT count(*)
     FROM public.business_service_taxonomy_categories bstc
     JOIN public.business_services bs ON bs.id = bstc.service_id
     JOIN public.businesses_public bp ON bp.id = bs.business_id
    WHERE bstc.category_id = ANY (r.ids) AND bs.is_active = true) AS active_services_count
FROM public.taxonomy_categories tc
JOIN rollup r ON r.category_id = tc.id
WHERE tc.is_active = true AND tc.is_public = true;

GRANT SELECT ON public.category_public_counts TO anon, authenticated, service_role;