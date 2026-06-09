/**
 * Phase 4 — Single source of truth for mapping legacy sector identifiers
 * (the values stored historically in `businesses.sectors`,
 * `quote_requests.sector`, `showcase_submissions.sector_slug`, and the
 * old `/sectors/:slug` URLs) to the new central taxonomy slugs.
 *
 * Edge functions cannot share this file directly. If you change a mapping
 * here, also update the inline copy in
 * `supabase/functions/match-quote-request/index.ts` (look for the
 * `LEGACY_SECTOR_TO_TAXONOMY_SLUG` constant).
 */

/**
 * Legacy slug → canonical primary-activity slug in `taxonomy_categories`.
 *
 * Updated for Taxonomy Restructure P1 — targets are the 13 canonical
 * primary activities (aluminum-works, glass-securit-works, …). Old
 * targets like `aluminum-glass-facades`, `stainless-steel-fabrication`,
 * `technology-systems` and `heavy-equipment-rental` are now legacy
 * keys that resolve forward to the new primaries.
 */
export const LEGACY_SECTOR_TO_TAXONOMY_SLUG: Record<string, string> = {
  // Aluminum
  aluminum: 'aluminum-works',
  alumnium: 'aluminum-works',
  aluminum_glass: 'aluminum-works',
  'aluminum-glass': 'aluminum-works',
  'aluminum-glass-facades': 'aluminum-works',
  // Glass
  glass: 'glass-securit-works',
  'glass-securit': 'glass-securit-works',
  securit: 'glass-securit-works',
  // Facades / storefronts
  storefronts: 'facades-cladding',
  facades: 'facades-cladding',
  cladding: 'facades-cladding',
  // Steel / iron
  steel: 'steel-metal-works',
  iron: 'steel-metal-works',
  'iron-steel': 'steel-metal-works',
  // Stainless
  stainless: 'stainless-steel-works',
  'stainless-steel': 'stainless-steel-works',
  stainless_steel: 'stainless-steel-works',
  'stainless-steel-fabrication': 'stainless-steel-works',
  // Wood / kitchens
  wood: 'wood-carpentry',
  cabinets: 'wood-carpentry',
  'wood-cabinets': 'wood-carpentry',
  kitchens: 'kitchens-works',
  // Finishing / fabrication / project fitout / construction
  fabrication: 'contracting-finishing',
  'fabrication-installation': 'contracting-finishing',
  finishing: 'contracting-finishing',
  'project-fitout': 'contracting-finishing',
  construction: 'contracting-finishing',
  'construction-building': 'contracting-finishing',
  // Elevators
  elevators: 'elevators-maintenance',
  escalators: 'elevators-maintenance',
  // Energy / sustainability
  energy: 'energy-sustainability',
  sustainability: 'energy-sustainability',
  solar: 'energy-sustainability',
  // Technology
  technology: 'technology-networks',
  'technology-systems': 'technology-networks',
  networks: 'technology-networks',
  // Security
  security: 'security-control-systems',
  surveillance: 'security-control-systems',
  // Equipment / rental
  equipment: 'equipment-rental',
  'heavy-equipment-rental': 'equipment-rental',
  rental: 'equipment-rental',
  lifting: 'equipment-rental',
  scaffolding: 'equipment-rental',
  'equipment-rental-provider': 'equipment-rental',
  // Operations / maintenance (kept for back-compat — legacy target retained)
  maintenance: 'elevators-maintenance',
  operations: 'elevators-maintenance',
  // Materials supply (kept on legacy target — out of Home scope)
  materials: 'building-materials-supply',
  'building-materials': 'building-materials-supply',
};

/** Resolve a legacy sector string to a taxonomy slug, or null if unmapped. */
export function resolveLegacySectorToTaxonomy(input: string | null | undefined): string | null {
  if (!input) return null;
  const key = String(input).trim().toLowerCase();
  if (!key) return null;
  return LEGACY_SECTOR_TO_TAXONOMY_SLUG[key] ?? null;
}

/**
 * Phase 8 — Runtime-overridable variant. Accepts an extra `overrides` map
 * sourced from `taxonomy_legacy_mappings` (admin-managed) and falls back to
 * the static table when no override exists. Edge functions and unit tests
 * stay on the static map.
 */
export function resolveLegacySectorWithOverrides(
  input: string | null | undefined,
  overrides?: Record<string, string> | null,
): string | null {
  if (!input) return null;
  const key = String(input).trim().toLowerCase();
  if (!key) return null;
  if (overrides && overrides[key]) return overrides[key];
  return LEGACY_SECTOR_TO_TAXONOMY_SLUG[key] ?? null;
}

/** Returns all legacy keys that map to the given taxonomy slug. */
export function legacyAliasesForTaxonomy(taxonomySlug: string): string[] {
  return Object.entries(LEGACY_SECTOR_TO_TAXONOMY_SLUG)
    .filter(([, v]) => v === taxonomySlug)
    .map(([k]) => k);
}