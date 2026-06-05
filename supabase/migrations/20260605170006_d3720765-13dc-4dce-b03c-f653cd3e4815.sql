ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS seo_title_ar text,
  ADD COLUMN IF NOT EXISTS seo_title_en text,
  ADD COLUMN IF NOT EXISTS seo_description_ar text,
  ADD COLUMN IF NOT EXISTS seo_description_en text,
  ADD COLUMN IF NOT EXISTS seo_keywords text[],
  ADD COLUMN IF NOT EXISTS og_image text;

ALTER TABLE public.categories
  ADD COLUMN IF NOT EXISTS seo_title_ar text,
  ADD COLUMN IF NOT EXISTS seo_title_en text,
  ADD COLUMN IF NOT EXISTS seo_description_ar text,
  ADD COLUMN IF NOT EXISTS seo_description_en text,
  ADD COLUMN IF NOT EXISTS featured_keywords text[];

ALTER TABLE public.blog_posts
  ADD COLUMN IF NOT EXISTS cover_alt_ar text,
  ADD COLUMN IF NOT EXISTS cover_alt_en text;

ALTER TABLE public.brand_catalog
  ADD COLUMN IF NOT EXISTS seo_title_ar text,
  ADD COLUMN IF NOT EXISTS seo_title_en text,
  ADD COLUMN IF NOT EXISTS seo_description_ar text,
  ADD COLUMN IF NOT EXISTS seo_description_en text,
  ADD COLUMN IF NOT EXISTS brand_keywords text[],
  ADD COLUMN IF NOT EXISTS og_image_url text;

CREATE OR REPLACE VIEW public.brands_public AS
SELECT
  b.id,
  b.ref_id,
  b.name_ar,
  b.name_en,
  b.slug,
  b.description_ar,
  b.description_en,
  b.logo_url,
  b.website,
  b.country_of_origin_code,
  b.country_of_origin_name_ar,
  b.country_of_origin_name_en,
  b.brand_owner_company,
  b.founded_year,
  b.is_local,
  b.is_verified,
  b.verification_status,
  b.sector_id,
  b.created_at,
  b.seo_title_ar,
  b.seo_title_en,
  b.seo_description_ar,
  b.seo_description_en,
  b.brand_keywords,
  b.og_image_url
FROM public.brand_catalog b
WHERE b.status = 'approved';