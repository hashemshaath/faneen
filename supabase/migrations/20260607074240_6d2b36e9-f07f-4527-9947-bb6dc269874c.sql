
-- Phase 9.2: resolve remaining needs_review legacy values via new service categories.
-- No legacy data is deleted. New categories are created with role=service for backfill.

DO $$
DECLARE
  v_service_type uuid := 'eac8bafa-d697-406e-ad26-5a8af5134991'; -- service
  v_kitchens uuid;
  v_site_prep uuid;
  v_wood uuid := '22e1203e-ce2c-4e68-9fdd-eb80552b5041';
  v_alu uuid := '21f3b1e2-38d8-403e-bc08-d3bff7765142';
  v_stainless uuid := '010b8a4f-919f-427d-856e-e0ae92024191';
  v_finishing uuid := '42eee263-23e7-4070-923a-2b96d69e8a4b';
  v_construction uuid := '6eede76d-f843-40be-a113-98709c8794f6';
  v_ops uuid := '562696de-45cd-4aab-b1e3-4a08d4850679';
BEGIN
  -- Kitchens and Fit-out
  INSERT INTO taxonomy_categories (
    taxonomy_type_id, slug, name_ar, name_en,
    short_description_ar, description_ar,
    seo_title_ar, seo_description_ar, keywords_ar,
    is_active, is_public, is_searchable, is_featured,
    show_in_registration, show_in_search, show_in_showcase, show_in_seo
  ) VALUES (
    v_service_type, 'kitchens-fitout', 'مطابخ وتجهيزات', 'Kitchens and Fit-out',
    'خدمات تفصيل وتركيب وتجهيز المطابخ السكنية والتجارية.',
    'يشمل هذا التصنيف أعمال المطابخ السكنية والتجارية، مثل مطابخ الخشب، مطابخ الألمنيوم، مطابخ الستانلس ستيل، وتجهيزات المطاعم والكافيهات حسب طبيعة المشروع.',
    'مطابخ وتجهيزات | تفصيل وتركيب مطابخ | قطاعات',
    'ابحث عن مزودي خدمات تفصيل وتركيب المطابخ وتجهيزات المطاعم والكافيهات، واطلب عروض أسعار عبر منصة قطاعات.',
    ARRAY['مطابخ','تفصيل مطابخ','مطابخ خشب','مطابخ ألمنيوم','مطابخ ستانلس','تجهيزات مطاعم','تجهيزات كافيهات']::text[],
    true, true, true, false,
    true, true, true, false
  )
  ON CONFLICT (slug) DO UPDATE SET updated_at = now()
  RETURNING id INTO v_kitchens;

  -- Site and Factory Preparation
  INSERT INTO taxonomy_categories (
    taxonomy_type_id, slug, name_ar, name_en,
    short_description_ar, description_ar,
    seo_title_ar, seo_description_ar, keywords_ar,
    is_active, is_public, is_searchable, is_featured,
    show_in_registration, show_in_search, show_in_showcase, show_in_seo
  ) VALUES (
    v_service_type, 'site-factory-preparation', 'تجهيز المواقع والمصانع', 'Site and Factory Preparation',
    'خدمات تجهيز المواقع والمصانع والأعمال التمهيدية قبل التنفيذ أو التشغيل.',
    'يشمل هذا التصنيف الخدمات المرتبطة بتجهيز المواقع والمصانع، مثل التهيئة الأولية، الأعمال التمهيدية، تجهيز المساحات، التنسيق مع فرق التنفيذ، وتحضير الموقع قبل بدء الأعمال حسب طبيعة المشروع.',
    'تجهيز المواقع والمصانع | خدمات تمهيدية للمشاريع | قطاعات',
    'ابحث عن مزودي خدمات تجهيز المواقع والمصانع والأعمال التمهيدية للمشاريع عبر منصة قطاعات.',
    ARRAY['تجهيز موقع','تجهيز مصنع','أعمال تمهيدية','تجهيز مواقع','تهيئة موقع','تجهيز مشروع','أعمال قبل التنفيذ']::text[],
    true, true, true, false,
    true, true, false, false
  )
  ON CONFLICT (slug) DO UPDATE SET updated_at = now()
  RETURNING id INTO v_site_prep;

  -- Relations: kitchens-fitout -> {wood, aluminum, stainless, finishing}
  INSERT INTO taxonomy_category_relations (category_id, related_category_id, relation_type)
  VALUES
    (v_kitchens, v_wood, 'service_activity_link'),
    (v_kitchens, v_alu, 'service_activity_link'),
    (v_kitchens, v_stainless, 'service_activity_link'),
    (v_kitchens, v_finishing, 'service_activity_link'),
    (v_site_prep, v_construction, 'service_activity_link'),
    (v_site_prep, v_finishing, 'service_activity_link'),
    (v_site_prep, v_ops, 'service_activity_link')
  ON CONFLICT DO NOTHING;

  -- Update legacy mappings to point to the new categories
  UPDATE taxonomy_legacy_mappings
  SET taxonomy_category_id = v_kitchens,
      mapping_status = 'mapped',
      confidence = 'high',
      notes = 'Mapped to service category kitchens-fitout because kitchens can relate to wood, aluminum, stainless-steel, and fit-out. Kept as service rather than primary activity.',
      updated_at = now()
  WHERE legacy_slug = 'kitchens';

  UPDATE taxonomy_legacy_mappings
  SET taxonomy_category_id = v_site_prep,
      mapping_status = 'mapped',
      confidence = 'medium',
      notes = 'Mapped to service category site-factory-preparation because the legacy value is ambiguous between construction, finishing, and operations. Kept as service with relations instead of forcing one primary activity.',
      updated_at = now()
  WHERE legacy_slug = 'site_factory_prep';
END $$;

-- Update apply backfill: pick role based on target taxonomy_type code.
CREATE OR REPLACE FUNCTION public.apply_business_secondary_taxonomy_backfill()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_secondary_linked     integer := 0;
  v_services_linked      integer := 0;
  v_skipped_existing     integer := 0;
  v_skipped_needs_review integer := 0;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'admin role required';
  END IF;

  SELECT count(*) INTO v_skipped_needs_review
  FROM taxonomy_legacy_mappings
  WHERE mapping_status IN ('needs_review','pending');

  WITH biz AS (
    SELECT b.id AS business_id, b.sectors FROM businesses b
     WHERE b.sectors IS NOT NULL AND array_length(b.sectors,1)>0
  ),
  candidates AS (
    SELECT DISTINCT
      b.business_id,
      m.taxonomy_category_id AS category_id,
      CASE WHEN tt.code = 'service' THEN 'service' ELSE 'secondary_activity' END AS target_role
    FROM biz b
    CROSS JOIN LATERAL unnest(b.sectors) AS sec(value)
    JOIN taxonomy_legacy_mappings m
      ON m.legacy_slug = sec.value
     AND m.mapping_status = 'mapped'
     AND m.taxonomy_category_id IS NOT NULL
    JOIN taxonomy_categories tc ON tc.id = m.taxonomy_category_id
    JOIN taxonomy_types tt ON tt.id = tc.taxonomy_type_id
    WHERE
      NOT EXISTS (
        SELECT 1 FROM business_taxonomy_categories btc
         WHERE btc.business_id=b.business_id
           AND btc.category_id=m.taxonomy_category_id
           AND btc.role='primary_activity'
      )
      AND NOT EXISTS (
        SELECT 1 FROM business_taxonomy_categories btc
         WHERE btc.business_id=b.business_id
           AND btc.category_id=m.taxonomy_category_id
      )
  ),
  count_existing AS (
    SELECT count(*) AS n FROM (
      SELECT DISTINCT b.business_id, m.taxonomy_category_id
      FROM biz b
      CROSS JOIN LATERAL unnest(b.sectors) AS sec(value)
      JOIN taxonomy_legacy_mappings m
        ON m.legacy_slug = sec.value
       AND m.mapping_status='mapped'
       AND m.taxonomy_category_id IS NOT NULL
      WHERE EXISTS (
        SELECT 1 FROM business_taxonomy_categories btc
         WHERE btc.business_id=b.business_id AND btc.category_id=m.taxonomy_category_id
      )
    ) z
  ),
  ins AS (
    INSERT INTO business_taxonomy_categories (business_id, category_id, role, is_primary)
    SELECT business_id, category_id, target_role, false
    FROM candidates
    ON CONFLICT (business_id, category_id, role) DO NOTHING
    RETURNING role
  )
  SELECT
    (SELECT count(*) FROM ins WHERE role='secondary_activity'),
    (SELECT count(*) FROM ins WHERE role='service'),
    (SELECT n FROM count_existing)
    INTO v_secondary_linked, v_services_linked, v_skipped_existing;

  RETURN jsonb_build_object(
    'secondary_linked',     v_secondary_linked,
    'services_linked',      v_services_linked,
    'skipped_existing',     v_skipped_existing,
    'skipped_needs_review', v_skipped_needs_review,
    'errors',               '[]'::jsonb,
    'applied_at',           now()
  );
END;
$function$;

-- Update preview: include role_suggested derived from the target taxonomy type code.
CREATE OR REPLACE FUNCTION public.preview_business_secondary_taxonomy_backfill()
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  rows_json jsonb;
  totals_json jsonb;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'admin role required';
  END IF;

  WITH biz AS (
    SELECT b.id AS business_id, b.name_ar, b.sectors
    FROM businesses b
    WHERE b.sectors IS NOT NULL AND array_length(b.sectors, 1) > 0
  ),
  per_sector AS (
    SELECT
      b.business_id,
      b.name_ar,
      b.sectors,
      sec.value AS legacy_value,
      m.taxonomy_category_id AS target_category_id,
      m.mapping_status,
      tc.slug AS target_slug,
      CASE WHEN tt.code = 'service' THEN 'service' ELSE 'secondary_activity' END AS role_suggested,
      EXISTS (
        SELECT 1 FROM business_taxonomy_categories btc
         WHERE btc.business_id = b.business_id
           AND btc.category_id = m.taxonomy_category_id
      ) AS already_linked,
      (SELECT btc.category_id FROM business_taxonomy_categories btc
        WHERE btc.business_id = b.business_id AND btc.role='primary_activity'
        LIMIT 1) AS primary_category_id
    FROM biz b
    CROSS JOIN LATERAL unnest(b.sectors) AS sec(value)
    LEFT JOIN taxonomy_legacy_mappings m ON m.legacy_slug = sec.value
    LEFT JOIN taxonomy_categories tc ON tc.id = m.taxonomy_category_id
    LEFT JOIN taxonomy_types tt ON tt.id = tc.taxonomy_type_id
  ),
  agg AS (
    SELECT
      ps.business_id,
      ps.name_ar,
      ps.sectors,
      (SELECT tc2.slug FROM business_taxonomy_categories btc
         JOIN taxonomy_categories tc2 ON tc2.id = btc.category_id
        WHERE btc.business_id = ps.business_id AND btc.role='primary_activity' LIMIT 1) AS primary_slug,
      array_agg(DISTINCT ps.target_slug)
        FILTER (WHERE ps.already_linked AND ps.target_slug IS NOT NULL) AS linked_targets,
      jsonb_agg(DISTINCT jsonb_build_object(
        'legacy_value', ps.legacy_value,
        'target_slug', ps.target_slug,
        'mapping_status', COALESCE(ps.mapping_status,'unmapped'),
        'role_suggested', ps.role_suggested
      )) FILTER (WHERE ps.mapping_status='mapped' AND ps.target_category_id IS NOT NULL
                   AND NOT ps.already_linked
                   AND (ps.primary_category_id IS NULL OR ps.primary_category_id <> ps.target_category_id)
                ) AS resolvable_extras,
      array_agg(DISTINCT ps.legacy_value)
        FILTER (WHERE ps.mapping_status IN ('needs_review','pending') OR ps.mapping_status IS NULL) AS needs_review_values
    FROM per_sector ps
    GROUP BY ps.business_id, ps.name_ar, ps.sectors
  )
  SELECT jsonb_agg(row_to_json(a)) INTO rows_json FROM agg a;

  SELECT jsonb_build_object(
    'secondary_resolvable',
      (SELECT count(*) FROM (
        SELECT DISTINCT ps.business_id, ps.target_category_id
        FROM per_sector ps
        WHERE ps.mapping_status='mapped'
          AND ps.target_category_id IS NOT NULL
          AND NOT ps.already_linked
          AND (ps.primary_category_id IS NULL OR ps.primary_category_id <> ps.target_category_id)
          AND ps.role_suggested = 'secondary_activity'
      ) z),
    'services_resolvable',
      (SELECT count(*) FROM (
        SELECT DISTINCT ps.business_id, ps.target_category_id
        FROM per_sector ps
        WHERE ps.mapping_status='mapped'
          AND ps.target_category_id IS NOT NULL
          AND NOT ps.already_linked
          AND (ps.primary_category_id IS NULL OR ps.primary_category_id <> ps.target_category_id)
          AND ps.role_suggested = 'service'
      ) z),
    'already_linked_extras',
      (SELECT count(*) FROM (
        SELECT DISTINCT ps.business_id, ps.target_category_id
        FROM per_sector ps
        WHERE ps.already_linked
      ) z),
    'needs_review_values',
      (SELECT count(DISTINCT ps.legacy_value)
        FROM per_sector ps
        WHERE ps.mapping_status IN ('needs_review','pending') OR ps.mapping_status IS NULL),
    'businesses_with_legacy',
      (SELECT count(*) FROM biz)
  ) INTO totals_json;

  RETURN jsonb_build_object(
    'totals', totals_json,
    'rows', COALESCE(rows_json, '[]'::jsonb),
    'generated_at', now()
  );
END;
$function$;
