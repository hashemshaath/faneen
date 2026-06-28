
-- Phase 3B: add optional FK from quote_requests to taxonomy_categories.
ALTER TABLE public.quote_requests
  ADD COLUMN IF NOT EXISTS taxonomy_category_id uuid NULL
  REFERENCES public.taxonomy_categories(id)
  ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_quote_requests_taxonomy_category_id
  ON public.quote_requests(taxonomy_category_id);

-- Backfill: best-effort, in-SQL legacy-slug → canonical-slug mapping.
-- Mirrors src/modules/taxonomy/legacy-mapping.ts. Unknown values stay NULL.
WITH legacy_map(legacy, canonical) AS (
  VALUES
    ('aluminum','aluminum-works'),
    ('alumnium','aluminum-works'),
    ('aluminum_glass','aluminum-works'),
    ('aluminum-glass','aluminum-works'),
    ('aluminum-glass-facades','aluminum-works'),
    ('aluminum-works','aluminum-works'),
    ('glass','glass-securit-works'),
    ('glass-securit','glass-securit-works'),
    ('securit','glass-securit-works'),
    ('glass-securit-works','glass-securit-works'),
    ('storefronts','facades-cladding'),
    ('facades','facades-cladding'),
    ('cladding','facades-cladding'),
    ('facades-cladding','facades-cladding'),
    ('steel','steel-metal-works'),
    ('iron','steel-metal-works'),
    ('iron-steel','steel-metal-works'),
    ('steel-metal-works','steel-metal-works'),
    ('stainless','stainless-steel-works'),
    ('stainless-steel','stainless-steel-works'),
    ('stainless_steel','stainless-steel-works'),
    ('stainless-steel-fabrication','stainless-steel-works'),
    ('stainless-steel-works','stainless-steel-works'),
    ('wood','wood-carpentry'),
    ('cabinets','wood-carpentry'),
    ('wood-cabinets','wood-carpentry'),
    ('wood-carpentry','wood-carpentry'),
    ('kitchens','kitchens-works'),
    ('kitchens-works','kitchens-works'),
    ('fabrication','contracting-finishing'),
    ('fabrication-installation','contracting-finishing'),
    ('finishing','contracting-finishing'),
    ('project-fitout','contracting-finishing'),
    ('construction','contracting-finishing'),
    ('construction-building','contracting-finishing'),
    ('contracting-finishing','contracting-finishing'),
    ('elevators','elevators-maintenance'),
    ('escalators','elevators-maintenance'),
    ('maintenance','elevators-maintenance'),
    ('operations','elevators-maintenance'),
    ('elevators-maintenance','elevators-maintenance'),
    ('energy','energy-sustainability'),
    ('sustainability','energy-sustainability'),
    ('solar','energy-sustainability'),
    ('energy-sustainability','energy-sustainability'),
    ('technology','technology-networks'),
    ('technology-systems','technology-networks'),
    ('networks','technology-networks'),
    ('technology-networks','technology-networks'),
    ('security','security-control-systems'),
    ('surveillance','security-control-systems'),
    ('security-control-systems','security-control-systems'),
    ('equipment','equipment-rental'),
    ('heavy-equipment-rental','equipment-rental'),
    ('rental','equipment-rental'),
    ('equipment-rental-provider','equipment-rental'),
    ('lifting','equipment-rental'),
    ('scaffolding','equipment-rental'),
    ('equipment-rental','equipment-rental')
)
UPDATE public.quote_requests qr
SET taxonomy_category_id = tc.id
FROM legacy_map lm
JOIN public.taxonomy_categories tc
  ON tc.slug = lm.canonical
 AND tc.is_active = true
 AND tc.is_archived = false
WHERE qr.taxonomy_category_id IS NULL
  AND qr.sector IS NOT NULL
  AND lower(trim(qr.sector)) = lm.legacy;
