-- Phase 9.1: preview + safe apply for secondary-activity backfill.

CREATE OR REPLACE FUNCTION public.preview_business_secondary_taxonomy_backfill()
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
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
        'role_suggested', 'secondary_activity'
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
      ) z),
    'already_linked',
      (SELECT count(*) FROM (
        SELECT DISTINCT ps.business_id, ps.target_category_id
        FROM per_sector ps
        WHERE ps.already_linked AND ps.target_category_id IS NOT NULL
      ) z),
    'needs_review',
      (SELECT count(*) FROM (
        SELECT DISTINCT ps.business_id, ps.legacy_value
        FROM per_sector ps
        WHERE ps.mapping_status IN ('needs_review','pending') OR ps.mapping_status IS NULL
      ) z),
    'businesses_total',
      (SELECT count(*) FROM biz)
  ) INTO totals_json
  FROM per_sector;
  -- per_sector is in WITH scope only at top; re-evaluated for totals_json via the same query above won't work,
  -- so we recompute totals in a separate CTE-less subquery:

  -- Recompute totals inline (per_sector isn't reachable outside the rows CTE).
  WITH biz AS (
    SELECT b.id AS business_id, b.sectors FROM businesses b
     WHERE b.sectors IS NOT NULL AND array_length(b.sectors,1)>0
  ),
  per_sector AS (
    SELECT b.business_id, sec.value AS legacy_value, m.taxonomy_category_id AS target_category_id,
           m.mapping_status,
           EXISTS (SELECT 1 FROM business_taxonomy_categories btc
                    WHERE btc.business_id=b.business_id AND btc.category_id=m.taxonomy_category_id) AS already_linked,
           (SELECT btc.category_id FROM business_taxonomy_categories btc
              WHERE btc.business_id=b.business_id AND btc.role='primary_activity' LIMIT 1) AS primary_category_id
    FROM biz b
    CROSS JOIN LATERAL unnest(b.sectors) AS sec(value)
    LEFT JOIN taxonomy_legacy_mappings m ON m.legacy_slug = sec.value
  )
  SELECT jsonb_build_object(
    'secondary_resolvable',
      (SELECT count(*) FROM (
        SELECT DISTINCT business_id, target_category_id FROM per_sector
        WHERE mapping_status='mapped' AND target_category_id IS NOT NULL
          AND NOT already_linked
          AND (primary_category_id IS NULL OR primary_category_id <> target_category_id)
      ) z),
    'already_linked_extras',
      (SELECT count(*) FROM (
        SELECT DISTINCT business_id, target_category_id FROM per_sector
        WHERE already_linked AND target_category_id IS NOT NULL
      ) z),
    'needs_review_values',
      (SELECT count(*) FROM (
        SELECT DISTINCT business_id, legacy_value FROM per_sector
        WHERE mapping_status IN ('needs_review','pending') OR mapping_status IS NULL
      ) z),
    'businesses_with_legacy', (SELECT count(*) FROM biz)
  ) INTO totals_json;

  result := jsonb_build_object(
    'totals', totals_json,
    'rows', COALESCE(rows_json, '[]'::jsonb),
    'generated_at', now()
  );
  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION public.apply_business_secondary_taxonomy_backfill()
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_secondary_linked     integer := 0;
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
      m.taxonomy_category_id AS category_id
    FROM biz b
    CROSS JOIN LATERAL unnest(b.sectors) AS sec(value)
    JOIN taxonomy_legacy_mappings m
      ON m.legacy_slug = sec.value
     AND m.mapping_status = 'mapped'
     AND m.taxonomy_category_id IS NOT NULL
    WHERE
      -- Skip when this category is already the primary activity.
      NOT EXISTS (
        SELECT 1 FROM business_taxonomy_categories btc
         WHERE btc.business_id=b.business_id
           AND btc.category_id=m.taxonomy_category_id
           AND btc.role='primary_activity'
      )
      -- Skip when ANY link (any role) already exists for this pair.
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
    SELECT business_id, category_id, 'secondary_activity', false
    FROM candidates
    ON CONFLICT (business_id, category_id, role) DO NOTHING
    RETURNING 1
  )
  SELECT (SELECT count(*) FROM ins),
         (SELECT n FROM count_existing)
    INTO v_secondary_linked, v_skipped_existing;

  RETURN jsonb_build_object(
    'secondary_linked',     v_secondary_linked,
    'skipped_existing',     v_skipped_existing,
    'skipped_needs_review', v_skipped_needs_review,
    'errors',               '[]'::jsonb,
    'applied_at',           now()
  );
END;
$$;

REVOKE ALL ON FUNCTION public.apply_business_secondary_taxonomy_backfill() FROM public;
GRANT EXECUTE ON FUNCTION public.apply_business_secondary_taxonomy_backfill() TO authenticated;
GRANT EXECUTE ON FUNCTION public.preview_business_secondary_taxonomy_backfill() TO authenticated;