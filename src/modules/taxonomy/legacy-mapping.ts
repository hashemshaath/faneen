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

/** Legacy slug → primary-activity slug in `taxonomy_categories`. */
export const LEGACY_SECTOR_TO_TAXONOMY_SLUG: Record<string, string> = {
  // Aluminum / glass / facades family
  aluminum: 'aluminum-glass-facades',
  alumnium: 'aluminum-glass-facades',
  glass: 'aluminum-glass-facades',
  aluminum_glass: 'aluminum-glass-facades',
  'aluminum-glass': 'aluminum-glass-facades',
  storefronts: 'aluminum-glass-facades',
  // Steel / iron
  steel: 'steel-metal-works',
  iron: 'steel-metal-works',
  'iron-steel': 'steel-metal-works',
  // Wood
  wood: 'wood-carpentry',
  cabinets: 'wood-carpentry',
  'wood-cabinets': 'wood-carpentry',
  // Stainless
  stainless: 'stainless-steel-fabrication',
  'stainless-steel': 'stainless-steel-fabrication',
  stainless_steel: 'stainless-steel-fabrication',
  // Finishing / fabrication / project fitout
  fabrication: 'contracting-finishing',
  'fabrication-installation': 'contracting-finishing',
  finishing: 'contracting-finishing',
  'project-fitout': 'contracting-finishing',
  // Construction
  construction: 'construction-building',
  // Materials supply
  materials: 'building-materials-supply',
  'building-materials': 'building-materials-supply',
  // Equipment
  equipment: 'heavy-equipment-rental',
  // Operations / maintenance
  maintenance: 'operations-maintenance',
  operations: 'operations-maintenance',
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