-- Phase 8: Taxonomy unification — legacy mapping registry
-- Single source of truth for legacy → taxonomy mappings, replacing scattered
-- static maps. Existing static fallback in src/modules/taxonomy/legacy-mapping.ts
-- stays as a safety net until the admin completes migration.

CREATE TABLE IF NOT EXISTS public.taxonomy_legacy_mappings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  legacy_source text NOT NULL,
  legacy_id text,
  legacy_slug text,
  legacy_name_ar text,
  legacy_name_en text,
  taxonomy_category_id uuid REFERENCES public.taxonomy_categories(id) ON DELETE SET NULL,
  mapping_status text NOT NULL DEFAULT 'pending',
  confidence text NOT NULL DEFAULT 'manual_review',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT taxonomy_legacy_mappings_status_chk
    CHECK (mapping_status IN ('mapped','pending','ignored','needs_review','archived')),
  CONSTRAINT taxonomy_legacy_mappings_confidence_chk
    CHECK (confidence IN ('exact','high','medium','low','manual_review')),
  CONSTRAINT taxonomy_legacy_mappings_unique_legacy
    UNIQUE (legacy_source, legacy_slug, legacy_id)
);

CREATE INDEX IF NOT EXISTS taxonomy_legacy_mappings_source_idx
  ON public.taxonomy_legacy_mappings (legacy_source);
CREATE INDEX IF NOT EXISTS taxonomy_legacy_mappings_status_idx
  ON public.taxonomy_legacy_mappings (mapping_status);
CREATE INDEX IF NOT EXISTS taxonomy_legacy_mappings_target_idx
  ON public.taxonomy_legacy_mappings (taxonomy_category_id);

-- GRANTs (admin-only data; no anon access)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.taxonomy_legacy_mappings TO authenticated;
GRANT ALL ON public.taxonomy_legacy_mappings TO service_role;

ALTER TABLE public.taxonomy_legacy_mappings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view legacy mappings"
  ON public.taxonomy_legacy_mappings
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert legacy mappings"
  ON public.taxonomy_legacy_mappings
  FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update legacy mappings"
  ON public.taxonomy_legacy_mappings
  FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete legacy mappings"
  ON public.taxonomy_legacy_mappings
  FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- updated_at trigger
CREATE TRIGGER trg_taxonomy_legacy_mappings_updated_at
  BEFORE UPDATE ON public.taxonomy_legacy_mappings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ──────────────────────────────────────────────────────────────────
-- Seed: legacy sector slugs from the static map + observed DB values
-- ──────────────────────────────────────────────────────────────────
WITH seed(legacy_source, legacy_slug, target_slug, confidence, notes) AS (
  VALUES
    -- From src/modules/taxonomy/legacy-mapping.ts
    ('static_sector', 'aluminum',                  'aluminum-glass-facades',      'exact',  'Static fallback'),
    ('static_sector', 'alumnium',                  'aluminum-glass-facades',      'high',   'Typo of aluminum'),
    ('static_sector', 'glass',                     'aluminum-glass-facades',      'high',   'Glass folded into aluminum/glass/facades family'),
    ('static_sector', 'aluminum_glass',            'aluminum-glass-facades',      'exact',  NULL),
    ('static_sector', 'aluminum-glass',            'aluminum-glass-facades',      'exact',  NULL),
    ('static_sector', 'storefronts',               'aluminum-glass-facades',      'high',   NULL),
    ('static_sector', 'steel',                     'steel-metal-works',           'exact',  NULL),
    ('static_sector', 'iron',                      'steel-metal-works',           'high',   NULL),
    ('static_sector', 'iron-steel',                'steel-metal-works',           'exact',  NULL),
    ('static_sector', 'wood',                      'wood-carpentry',              'exact',  NULL),
    ('static_sector', 'cabinets',                  'wood-carpentry',              'high',   NULL),
    ('static_sector', 'wood-cabinets',             'wood-carpentry',              'exact',  NULL),
    ('static_sector', 'stainless',                 'stainless-steel-fabrication', 'high',   NULL),
    ('static_sector', 'stainless-steel',           'stainless-steel-fabrication', 'exact',  NULL),
    ('static_sector', 'stainless_steel',           'stainless-steel-fabrication', 'exact',  NULL),
    ('static_sector', 'fabrication',               'contracting-finishing',       'medium', NULL),
    ('static_sector', 'fabrication-installation',  'contracting-finishing',       'medium', NULL),
    ('static_sector', 'finishing',                 'contracting-finishing',       'high',   NULL),
    ('static_sector', 'project-fitout',            'contracting-finishing',       'high',   NULL),
    ('static_sector', 'construction',              'construction-building',       'exact',  NULL),
    ('static_sector', 'materials',                 'building-materials-supply',   'high',   NULL),
    ('static_sector', 'building-materials',        'building-materials-supply',   'exact',  NULL),
    ('static_sector', 'equipment',                 'heavy-equipment-rental',      'high',   NULL),
    ('static_sector', 'maintenance',               'operations-maintenance',      'high',   NULL),
    ('static_sector', 'operations',                'operations-maintenance',      'exact',  NULL),
    -- Observed in businesses.sectors but not in static map
    ('business_sector', 'facades',                 'aluminum-glass-facades',      'high',   'Auto-suggested from sectors usage'),
    ('business_sector', 'kitchens',                'wood-carpentry',              'medium', 'Kitchens typically wood — verify'),
    ('business_sector', 'gypsum_decoration',       'contracting-finishing',       'medium', 'Gypsum decoration → finishing'),
    ('business_sector', 'fire_doors',              'steel-metal-works',           'medium', 'Fire doors → steel/metal'),
    ('business_sector', 'site_factory_prep',       NULL,                          'manual_review', 'Needs review — workshop preparation'),
    ('business_sector', 'maintenance_services',    'operations-maintenance',      'high',   NULL),
    ('business_sector', 'measurement_services',    NULL,                          'manual_review', 'Needs review — measurement is a service'),
    ('business_sector', 'design_services',         NULL,                          'manual_review', 'Needs review — design is a service')
)
INSERT INTO public.taxonomy_legacy_mappings
  (legacy_source, legacy_slug, taxonomy_category_id, mapping_status, confidence, notes)
SELECT
  s.legacy_source,
  s.legacy_slug,
  tc.id,
  CASE
    WHEN s.target_slug IS NULL THEN 'needs_review'
    WHEN tc.id IS NULL THEN 'needs_review'
    ELSE 'mapped'
  END,
  s.confidence,
  s.notes
FROM seed s
LEFT JOIN public.taxonomy_categories tc ON tc.slug = s.target_slug
ON CONFLICT (legacy_source, legacy_slug, legacy_id) DO NOTHING;

-- ──────────────────────────────────────────────────────────────────
-- Preview-only RPC: counts how much backfill would touch, no writes.
-- ──────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.preview_taxonomy_backfill()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'admin role required';
  END IF;

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
    'business_services_with_legacy_category',
      (SELECT count(*) FROM business_services WHERE category_id IS NOT NULL),
    'showcase_without_taxonomy',
      (SELECT count(*) FROM showcase_submissions WHERE taxonomy_category_id IS NULL),
    'quote_requests_with_legacy_sector',
      (SELECT count(*) FROM quote_requests WHERE sector IS NOT NULL AND sector <> ''),
    'mappings_pending_review',
      (SELECT count(*) FROM taxonomy_legacy_mappings WHERE mapping_status IN ('pending','needs_review')),
    'mappings_total',
      (SELECT count(*) FROM taxonomy_legacy_mappings),
    'generated_at', now()
  ) INTO result;

  RETURN result;
END;
$$;

REVOKE ALL ON FUNCTION public.preview_taxonomy_backfill() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.preview_taxonomy_backfill() TO authenticated;