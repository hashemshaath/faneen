/**
 * Phase 3B — Pure resolver: maps a quote-request `sector` value
 * (canonical or legacy) plus an optional `taxonomy_primary_slug` from
 * metadata to a canonical taxonomy slug. Does not touch the database.
 *
 * Rules:
 *  - canonical slug → same canonical slug
 *  - legacy slug    → resolved canonical slug
 *  - `other`        → null (never linked to a FK)
 *  - unknown/empty/null → null
 */
import {
  CANONICAL_PRIMARY_SLUGS,
  isCanonicalPrimarySlug,
} from './canonical-primaries';
import { LEGACY_SECTOR_TO_TAXONOMY_SLUG } from './legacy-mapping';

const CANONICAL_SET: Set<string> = new Set(CANONICAL_PRIMARY_SLUGS);

export interface ResolveQuoteSectorInput {
  sector?: string | null;
  taxonomyPrimarySlug?: string | null;
}

function normalize(value: string | null | undefined): string | null {
  if (!value) return null;
  const v = String(value).trim().toLowerCase();
  return v.length ? v : null;
}

export function resolveQuoteSectorTaxonomy(
  input: ResolveQuoteSectorInput,
): string | null {
  const primary = normalize(input.taxonomyPrimarySlug);
  if (primary && primary !== 'other') {
    if (CANONICAL_SET.has(primary)) return primary;
    const mapped = LEGACY_SECTOR_TO_TAXONOMY_SLUG[primary];
    if (mapped && CANONICAL_SET.has(mapped)) return mapped;
  }

  const sector = normalize(input.sector);
  if (!sector || sector === 'other') return null;

  if (isCanonicalPrimarySlug(sector)) return sector;
  const mapped = LEGACY_SECTOR_TO_TAXONOMY_SLUG[sector];
  if (mapped && CANONICAL_SET.has(mapped)) return mapped;
  return null;
}