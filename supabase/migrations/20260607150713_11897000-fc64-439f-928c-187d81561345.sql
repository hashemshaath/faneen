-- Phase 18i — Rebuild public views on taxonomy and drop legacy `category_id`
-- bridge columns on `businesses` and `business_services`.

-- 1) Drop dependent view first (category_public_counts depends on businesses_public
--    and on business_services.category_id).
DROP VIEW IF EXISTS public.category_public_counts;

-- 2) Rebuild businesses_public WITHOUT the legacy category_id column.
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
  AND approval_status = 'published'::business_approval_status
  AND is_demo = false;

GRANT SELECT ON public.businesses_public TO anon, authenticated;
GRANT ALL ON public.businesses_public TO service_role;

-- 3) Rebuild category_public_counts off the taxonomy tables.
--    Counts roll up category + its direct children (matching prior behaviour),
--    and reuse `businesses_public` so demo/draft/unpublished providers are
--    excluded automatically.
CREATE VIEW public.category_public_counts
WITH (security_invoker = on)
AS
WITH rollup AS (
  SELECT
    tc.id AS category_id,
    ARRAY(
      SELECT child.id
        FROM public.taxonomy_categories child
       WHERE child.is_active = true
         AND child.is_public = true
         AND (child.id = tc.id OR child.parent_id = tc.id)
    ) AS ids
  FROM public.taxonomy_categories tc
  WHERE tc.is_active = true
    AND tc.is_public = true
)
SELECT
  tc.id AS category_id,
  tc.slug,
  tc.name_ar,
  tc.name_en,
  tc.parent_id,
  (
    SELECT count(DISTINCT bp.id)
      FROM public.business_taxonomy_categories btc
      JOIN public.businesses_public bp ON bp.id = btc.business_id
     WHERE btc.category_id = ANY (r.ids)
  ) AS providers_count,
  (
    SELECT count(*)
      FROM public.business_service_taxonomy_categories bstc
      JOIN public.business_services bs ON bs.id = bstc.service_id
      JOIN public.businesses_public bp ON bp.id = bs.business_id
     WHERE bstc.category_id = ANY (r.ids)
  ) AS services_count,
  (
    SELECT count(*)
      FROM public.business_service_taxonomy_categories bstc
      JOIN public.business_services bs ON bs.id = bstc.service_id
      JOIN public.businesses_public bp ON bp.id = bs.business_id
     WHERE bstc.category_id = ANY (r.ids)
       AND bs.is_active = true
  ) AS active_services_count
FROM public.taxonomy_categories tc
JOIN rollup r ON r.category_id = tc.id
WHERE tc.is_active = true
  AND tc.is_public = true;

GRANT SELECT ON public.category_public_counts TO anon, authenticated;
GRANT ALL ON public.category_public_counts TO service_role;

-- 4) Drop the legacy bridge columns now that no view/runtime reads them.
ALTER TABLE public.businesses DROP COLUMN IF EXISTS category_id;
ALTER TABLE public.business_services DROP COLUMN IF EXISTS category_id;