CREATE OR REPLACE VIEW public.category_public_counts AS
WITH parent_map AS (
  SELECT id, parent_id
  FROM public.categories
  WHERE is_active = true
),
rollup AS (
  SELECT c.id AS category_id,
         ARRAY(
           SELECT id
           FROM parent_map
           WHERE id = c.id OR parent_id = c.id
         ) AS ids
  FROM public.categories c
  WHERE c.is_active = true
)
SELECT
  c.id AS category_id,
  c.slug,
  c.name_ar,
  c.name_en,
  c.parent_id,
  (
    SELECT COUNT(DISTINCT bp.id)
    FROM public.businesses_public bp
    WHERE bp.category_id = ANY(r.ids)
  ) AS providers_count,
  (
    SELECT COUNT(*)
    FROM public.business_services bs
    JOIN public.businesses_public bp ON bp.id = bs.business_id
    WHERE bs.category_id = ANY(r.ids)
  ) AS services_count,
  (
    SELECT COUNT(*)
    FROM public.business_services bs
    JOIN public.businesses_public bp ON bp.id = bs.business_id
    WHERE bs.category_id = ANY(r.ids)
      AND bs.is_active = true
  ) AS active_services_count
FROM public.categories c
JOIN rollup r ON r.category_id = c.id
WHERE c.is_active = true;

GRANT SELECT ON public.category_public_counts TO anon, authenticated;

COMMENT ON VIEW public.category_public_counts IS
'Public-safe counts of providers and services per category. Source: businesses_public.';