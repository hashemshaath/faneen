
ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS logo_image_asset_id  uuid REFERENCES public.image_assets(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS cover_image_asset_id uuid REFERENCES public.image_assets(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS logo_image_variants  jsonb,
  ADD COLUMN IF NOT EXISTS cover_image_variants jsonb;

CREATE INDEX IF NOT EXISTS idx_businesses_logo_image_asset_id  ON public.businesses(logo_image_asset_id);
CREATE INDEX IF NOT EXISTS idx_businesses_cover_image_asset_id ON public.businesses(cover_image_asset_id);

COMMENT ON COLUMN public.businesses.logo_image_asset_id  IS 'Phase 2.2 image pipeline — link to image_assets row for optimized logo variants.';
COMMENT ON COLUMN public.businesses.cover_image_asset_id IS 'Phase 2.2 image pipeline — link to image_assets row for optimized cover variants.';
COMMENT ON COLUMN public.businesses.logo_image_variants  IS 'Phase 2.2 — denormalized cache of image_assets.variants for logo (avoid join on public reads).';
COMMENT ON COLUMN public.businesses.cover_image_variants IS 'Phase 2.2 — denormalized cache of image_assets.variants for cover (avoid join on public reads).';

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
  user_id,
  approval_status
FROM public.businesses
WHERE is_active = true
  AND approval_status = 'published'::business_approval_status
  AND is_demo = false;

GRANT SELECT ON public.businesses_public TO anon, authenticated;

CREATE VIEW public.category_public_counts AS
WITH rollup AS (
  SELECT tc_1.id AS category_id,
    ARRAY( SELECT child.id
           FROM public.taxonomy_categories child
           WHERE child.is_active = true
             AND child.is_public = true
             AND (child.id = tc_1.id OR child.parent_id = tc_1.id)
    ) AS ids
  FROM public.taxonomy_categories tc_1
  WHERE tc_1.is_active = true AND tc_1.is_public = true
)
SELECT tc.id AS category_id,
   tc.slug,
   tc.name_ar,
   tc.name_en,
   tc.parent_id,
   ( SELECT count(DISTINCT bp.id)
       FROM public.business_taxonomy_categories btc
       JOIN public.businesses_public bp ON bp.id = btc.business_id
       WHERE btc.category_id = ANY (r.ids)
   ) AS providers_count,
   ( SELECT count(*)
       FROM public.business_service_taxonomy_categories bstc
       JOIN public.business_services bs ON bs.id = bstc.service_id
       JOIN public.businesses_public bp ON bp.id = bs.business_id
       WHERE bstc.category_id = ANY (r.ids)
   ) AS services_count,
   ( SELECT count(*)
       FROM public.business_service_taxonomy_categories bstc
       JOIN public.business_services bs ON bs.id = bstc.service_id
       JOIN public.businesses_public bp ON bp.id = bs.business_id
       WHERE bstc.category_id = ANY (r.ids) AND bs.is_active = true
   ) AS active_services_count
  FROM public.taxonomy_categories tc
  JOIN rollup r ON r.category_id = tc.id
  WHERE tc.is_active = true AND tc.is_public = true;

GRANT SELECT ON public.category_public_counts TO anon, authenticated;
