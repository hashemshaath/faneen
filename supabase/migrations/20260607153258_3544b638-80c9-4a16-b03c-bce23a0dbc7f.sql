DROP VIEW IF EXISTS public.private_sectors_public;

CREATE VIEW public.private_sectors_public AS
SELECT
  p.id,
  p.ref_id,
  p.business_id,
  p.parent_sector,
  p.brand_type,
  p.name_ar,
  p.name_en,
  p.slug,
  p.short_description_ar,
  p.short_description_en,
  p.description_ar,
  p.description_en,
  p.logo_url,
  p.cover_url,
  p.website,
  p.country_id,
  p.city_id,
  p.category_id,
  p.contact_email,
  p.contact_phone,
  p.established_year,
  p.is_featured,
  p.sort_order,
  p.seo_title_ar,
  p.seo_title_en,
  p.seo_description_ar,
  p.seo_description_en,
  p.seo_keywords,
  p.created_at,
  p.updated_at,
  c.name_ar AS city_name_ar,
  c.name_en AS city_name_en,
  NULL::text AS category_name_ar,
  NULL::text AS category_name_en,
  NULL::text AS category_slug,
  b.name_ar AS business_name_ar,
  b.name_en AS business_name_en,
  b.username AS business_username
FROM public.private_sectors p
LEFT JOIN public.cities c ON c.id = p.city_id
LEFT JOIN public.businesses b ON b.id = p.business_id
WHERE p.status = 'approved'::private_sector_status;

GRANT SELECT ON public.private_sectors_public TO anon, authenticated;

DROP TABLE IF EXISTS public.categories CASCADE;