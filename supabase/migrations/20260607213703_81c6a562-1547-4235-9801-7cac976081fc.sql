-- Phase 2.4 — Image Optimization Audit (read-only, no backfill).
-- Returns counts of legacy images that have no `image_asset_id` / variants
-- across Showcase, Projects, Project gallery, Businesses (logo+cover),
-- Brand products, and Business services. Plus a sample of up to 20
-- candidates with source_table / record_id / image_url / suggested_kind
-- / estimated_priority. Admin-only.

CREATE OR REPLACE FUNCTION public.preview_image_optimization_backfill()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_admin boolean;
  showcase_count bigint;
  projects_cover_count bigint;
  project_images_count bigint;
  business_logo_count bigint;
  business_cover_count bigint;
  brand_products_count bigint;
  business_services_count bigint;
  sample jsonb;
BEGIN
  -- Admin gate (reuses has_role security-definer helper).
  is_admin := public.has_role(auth.uid(), 'admin'::public.app_role);
  IF NOT COALESCE(is_admin, false) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  SELECT count(*) INTO showcase_count
  FROM public.showcase_submissions
  WHERE image_asset_id IS NULL AND image_url IS NOT NULL AND image_url <> '';

  SELECT count(*) INTO projects_cover_count
  FROM public.projects
  WHERE cover_image_asset_id IS NULL AND cover_image_url IS NOT NULL AND cover_image_url <> '';

  SELECT count(*) INTO project_images_count
  FROM public.project_images
  WHERE image_asset_id IS NULL AND image_url IS NOT NULL AND image_url <> '';

  SELECT count(*) INTO business_logo_count
  FROM public.businesses
  WHERE logo_image_asset_id IS NULL AND logo_url IS NOT NULL AND logo_url <> '';

  SELECT count(*) INTO business_cover_count
  FROM public.businesses
  WHERE cover_image_asset_id IS NULL AND cover_url IS NOT NULL AND cover_url <> '';

  SELECT count(*) INTO brand_products_count
  FROM public.brand_products
  WHERE image_asset_id IS NULL AND image_url IS NOT NULL AND image_url <> '';

  SELECT count(*) INTO business_services_count
  FROM public.business_services
  WHERE image_asset_id IS NULL AND image_url IS NOT NULL AND image_url <> '';

  -- Sample: 20 most-recent legacy candidates across all sources.
  -- Priority heuristic (higher = more visible / higher LCP impact):
  --   business cover  = 90, project cover  = 80, business logo = 70,
  --   showcase        = 60, project image  = 50, brand product = 40,
  --   business service = 30.
  WITH unioned AS (
    SELECT 'showcase_submissions'::text AS source_table,
           id::text AS record_id, image_url AS image_url,
           'showcase'::text AS suggested_kind, 60 AS estimated_priority,
           created_at
      FROM public.showcase_submissions
     WHERE image_asset_id IS NULL AND image_url IS NOT NULL AND image_url <> ''
    UNION ALL
    SELECT 'projects', id::text, cover_image_url,
           'project_cover', 80, created_at
      FROM public.projects
     WHERE cover_image_asset_id IS NULL AND cover_image_url IS NOT NULL AND cover_image_url <> ''
    UNION ALL
    SELECT 'project_images', id::text, image_url,
           'project_gallery', 50, created_at
      FROM public.project_images
     WHERE image_asset_id IS NULL AND image_url IS NOT NULL AND image_url <> ''
    UNION ALL
    SELECT 'businesses', id::text, logo_url,
           'business_logo', 70, created_at
      FROM public.businesses
     WHERE logo_image_asset_id IS NULL AND logo_url IS NOT NULL AND logo_url <> ''
    UNION ALL
    SELECT 'businesses', id::text, cover_url,
           'business_cover', 90, created_at
      FROM public.businesses
     WHERE cover_image_asset_id IS NULL AND cover_url IS NOT NULL AND cover_url <> ''
    UNION ALL
    SELECT 'brand_products', id::text, image_url,
           'product', 40, created_at
      FROM public.brand_products
     WHERE image_asset_id IS NULL AND image_url IS NOT NULL AND image_url <> ''
    UNION ALL
    SELECT 'business_services', id::text, image_url,
           'service', 30, created_at
      FROM public.business_services
     WHERE image_asset_id IS NULL AND image_url IS NOT NULL AND image_url <> ''
  )
  SELECT COALESCE(jsonb_agg(row), '[]'::jsonb)
    INTO sample
    FROM (
      SELECT jsonb_build_object(
               'source_table', source_table,
               'record_id', record_id,
               'image_url', image_url,
               'suggested_kind', suggested_kind,
               'estimated_priority', estimated_priority
             ) AS row
        FROM unioned
       ORDER BY estimated_priority DESC, created_at DESC NULLS LAST
       LIMIT 20
    ) s;

  RETURN jsonb_build_object(
    'generated_at', now(),
    'counts', jsonb_build_object(
      'showcase_legacy', showcase_count,
      'projects_cover_legacy', projects_cover_count,
      'project_images_legacy', project_images_count,
      'business_logos_legacy', business_logo_count,
      'business_covers_legacy', business_cover_count,
      'brand_products_legacy', brand_products_count,
      'business_services_legacy', business_services_count,
      'total_legacy',
        showcase_count + projects_cover_count + project_images_count
        + business_logo_count + business_cover_count
        + brand_products_count + business_services_count
    ),
    'sample', sample
  );
END;
$$;

REVOKE ALL ON FUNCTION public.preview_image_optimization_backfill() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.preview_image_optimization_backfill() TO authenticated;

COMMENT ON FUNCTION public.preview_image_optimization_backfill() IS
  'Phase 2.4 audit (read-only). Returns counts of legacy images missing image_asset_id across showcase/projects/businesses/brand_products/business_services plus a 20-row sample. Admin-only. No data is modified.';
