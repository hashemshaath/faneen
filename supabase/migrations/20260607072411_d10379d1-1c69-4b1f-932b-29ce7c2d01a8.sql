-- Phase 9: improved preview + safe apply backfill RPCs.

CREATE OR REPLACE FUNCTION public.preview_taxonomy_backfill()
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
  sample jsonb;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'admin role required';
  END IF;

  -- Sample of first 20 records that would be backfilled
  WITH biz_candidates AS (
    SELECT DISTINCT ON (b.id)
      'business'::text AS record_type,
      b.id::text       AS record_id,
      sec.value        AS legacy_value,
      m.legacy_source  AS source,
      tc.slug          AS target_slug,
      tc.name_ar       AS target_name_ar
    FROM businesses b
    CROSS JOIN LATERAL unnest(COALESCE(b.sectors, ARRAY[]::text[])) AS sec(value)
    JOIN taxonomy_legacy_mappings m
      ON m.legacy_slug = sec.value
     AND m.mapping_status = 'mapped'
     AND m.taxonomy_category_id IS NOT NULL
    JOIN taxonomy_categories tc ON tc.id = m.taxonomy_category_id
    WHERE NOT EXISTS (
      SELECT 1 FROM business_taxonomy_categories btc WHERE btc.business_id = b.id
    )
    ORDER BY b.id, sec.ordinality
  ),
  showcase_candidates AS (
    SELECT
      'showcase'::text   AS record_type,
      s.id::text         AS record_id,
      s.sector_slug      AS legacy_value,
      'showcase_sector'::text AS source,
      tc.slug            AS target_slug,
      tc.name_ar         AS target_name_ar
    FROM showcase_submissions s
    JOIN taxonomy_legacy_mappings m
      ON m.legacy_slug = s.sector_slug
     AND m.mapping_status = 'mapped'
     AND m.taxonomy_category_id IS NOT NULL
    JOIN taxonomy_categories tc ON tc.id = m.taxonomy_category_id
    WHERE s.taxonomy_category_id IS NULL AND s.sector_slug IS NOT NULL
  ),
  unified AS (
    SELECT * FROM biz_candidates
    UNION ALL
    SELECT * FROM showcase_candidates
  )
  SELECT COALESCE(jsonb_agg(row_to_json(u)), '[]'::jsonb)
  INTO sample
  FROM (SELECT * FROM unified LIMIT 20) u;

  SELECT jsonb_build_object(
    'businesses_with_legacy_no_taxonomy',
      (SELECT count(*) FROM businesses b
        WHERE b.sectors IS NOT NULL AND array_length(b.sectors, 1) > 0
          AND NOT EXISTS (
            SELECT 1 FROM business_taxonomy_categories btc WHERE btc.business_id = b.id
          )
      ),
    'businesses_resolvable',
      (SELECT count(DISTINCT b.id) FROM businesses b
        CROSS JOIN LATERAL unnest(COALESCE(b.sectors, ARRAY[]::text[])) AS sec(value)
        JOIN taxonomy_legacy_mappings m
          ON m.legacy_slug = sec.value
         AND m.mapping_status = 'mapped'
         AND m.taxonomy_category_id IS NOT NULL
        WHERE NOT EXISTS (
          SELECT 1 FROM business_taxonomy_categories btc WHERE btc.business_id = b.id
        )
      ),
    'businesses_already_linked',
      (SELECT count(DISTINCT business_id) FROM business_taxonomy_categories),
    'business_services_with_legacy_category',
      (SELECT count(*) FROM business_services WHERE category_id IS NOT NULL),
    'showcase_without_taxonomy',
      (SELECT count(*) FROM showcase_submissions WHERE taxonomy_category_id IS NULL),
    'showcase_resolvable',
      (SELECT count(*) FROM showcase_submissions s
        JOIN taxonomy_legacy_mappings m
          ON m.legacy_slug = s.sector_slug
         AND m.mapping_status = 'mapped'
         AND m.taxonomy_category_id IS NOT NULL
        WHERE s.taxonomy_category_id IS NULL
      ),
    'quote_requests_with_legacy_sector',
      (SELECT count(*) FROM quote_requests WHERE sector IS NOT NULL AND sector <> ''),
    'mappings_pending_review',
      (SELECT count(*) FROM taxonomy_legacy_mappings WHERE mapping_status IN ('pending','needs_review')),
    'mappings_total',
      (SELECT count(*) FROM taxonomy_legacy_mappings),
    'mappings_ready',
      (SELECT count(*) FROM taxonomy_legacy_mappings
        WHERE mapping_status = 'mapped' AND taxonomy_category_id IS NOT NULL),
    'sample', sample,
    'generated_at', now()
  ) INTO result;

  RETURN result;
END;
$$;

-- Safe apply backfill. Only links missing relations; never deletes, never
-- overwrites existing taxonomy assignments; ignores needs_review/pending.
CREATE OR REPLACE FUNCTION public.apply_taxonomy_backfill()
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_businesses_linked    integer := 0;
  v_showcase_linked      integer := 0;
  v_skipped_existing     integer := 0;
  v_skipped_needs_review integer := 0;
  v_errors               jsonb   := '[]'::jsonb;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'admin role required';
  END IF;

  -- Count what we're choosing to skip (transparency in the response).
  SELECT count(*) INTO v_skipped_needs_review
  FROM taxonomy_legacy_mappings
  WHERE mapping_status IN ('needs_review', 'pending');

  SELECT count(DISTINCT business_id) INTO v_skipped_existing
  FROM business_taxonomy_categories;

  -- 1) Link businesses: pick the FIRST resolvable sector per business
  --    and insert as primary_activity. Skip any business with existing links.
  WITH first_match AS (
    SELECT DISTINCT ON (b.id)
      b.id          AS business_id,
      m.taxonomy_category_id AS category_id
    FROM businesses b
    CROSS JOIN LATERAL unnest(COALESCE(b.sectors, ARRAY[]::text[])) WITH ORDINALITY AS sec(value, ord)
    JOIN taxonomy_legacy_mappings m
      ON m.legacy_slug = sec.value
     AND m.mapping_status = 'mapped'
     AND m.taxonomy_category_id IS NOT NULL
    WHERE NOT EXISTS (
      SELECT 1 FROM business_taxonomy_categories btc WHERE btc.business_id = b.id
    )
    ORDER BY b.id, sec.ord
  ),
  ins AS (
    INSERT INTO business_taxonomy_categories (business_id, category_id, role, is_primary)
    SELECT business_id, category_id, 'primary_activity', true
    FROM first_match
    ON CONFLICT (business_id, category_id, role) DO NOTHING
    RETURNING 1
  )
  SELECT count(*) INTO v_businesses_linked FROM ins;

  -- 2) Fill showcase taxonomy_category_id only when NULL.
  WITH upd AS (
    UPDATE showcase_submissions s
       SET taxonomy_category_id = m.taxonomy_category_id
      FROM taxonomy_legacy_mappings m
     WHERE s.taxonomy_category_id IS NULL
       AND s.sector_slug IS NOT NULL
       AND m.legacy_slug = s.sector_slug
       AND m.mapping_status = 'mapped'
       AND m.taxonomy_category_id IS NOT NULL
    RETURNING 1
  )
  SELECT count(*) INTO v_showcase_linked FROM upd;

  RETURN jsonb_build_object(
    'businesses_linked',      v_businesses_linked,
    'showcase_linked',        v_showcase_linked,
    'skipped_existing',       v_skipped_existing,
    'skipped_needs_review',   v_skipped_needs_review,
    'errors',                 v_errors,
    'applied_at',             now()
  );
END;
$$;

REVOKE ALL ON FUNCTION public.apply_taxonomy_backfill() FROM public;
GRANT EXECUTE ON FUNCTION public.apply_taxonomy_backfill() TO authenticated;
GRANT EXECUTE ON FUNCTION public.preview_taxonomy_backfill() TO authenticated;