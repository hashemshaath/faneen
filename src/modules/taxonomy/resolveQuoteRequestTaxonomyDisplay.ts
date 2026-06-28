/**
 * Phase 3C — Pure observability helper.
 *
 * Resolves a quote request's display taxonomy without changing submit/match
 * behavior. Used by admin/operations surfaces to render the canonical
 * taxonomy label when available, or a safe legacy `sector` fallback.
 *
 * Status semantics:
 *  - `canonical`       — `taxonomy_category_id` is present and resolves to a canonical primary.
 *  - `legacy_resolved` — no FK, but `sector` resolves through legacy mapping.
 *  - `unclassified`    — neither FK nor a resolvable sector (e.g. `other`/unknown/null).
 */
import {
  CANONICAL_PRIMARY_LABELS,
  CANONICAL_PRIMARY_SLUGS,
  isCanonicalPrimarySlug,
  type CanonicalPrimarySlug,
} from './canonical-primaries';
import { LEGACY_SECTOR_TO_TAXONOMY_SLUG } from './legacy-mapping';

const CANONICAL_SET: Set<string> = new Set(CANONICAL_PRIMARY_SLUGS);

export type QuoteTaxonomyDisplayStatus =
  | 'canonical'
  | 'legacy_resolved'
  | 'unclassified';

export interface QuoteTaxonomyDisplayInput {
  /** FK on `quote_requests.taxonomy_category_id` (id). */
  taxonomyCategoryId?: string | null;
  /** Slug joined from `taxonomy_categories.slug` when available. */
  taxonomyCategorySlug?: string | null;
  /** Optional pre-joined Arabic label from `taxonomy_categories.name_ar`. */
  taxonomyCategoryNameAr?: string | null;
  /** Optional pre-joined English label from `taxonomy_categories.name_en`. */
  taxonomyCategoryNameEn?: string | null;
  /** Legacy `quote_requests.sector` value. */
  sector?: string | null;
}

export interface QuoteTaxonomyDisplay {
  status: QuoteTaxonomyDisplayStatus;
  /** Canonical slug if resolvable, otherwise null. */
  canonicalSlug: CanonicalPrimarySlug | null;
  labelAr: string;
  labelEn: string;
  /** Original legacy sector value retained for transparency. */
  legacySector: string | null;
}

function normalize(value: string | null | undefined): string | null {
  if (!value) return null;
  const v = String(value).trim().toLowerCase();
  return v.length ? v : null;
}

export function resolveQuoteRequestTaxonomyDisplay(
  input: QuoteTaxonomyDisplayInput,
): QuoteTaxonomyDisplay {
  const legacySector = normalize(input.sector);
  const fkSlug = normalize(input.taxonomyCategorySlug);

  // 1. FK-first when slug is present and canonical.
  if (input.taxonomyCategoryId && fkSlug && CANONICAL_SET.has(fkSlug)) {
    const canonical = fkSlug as CanonicalPrimarySlug;
    const labels = CANONICAL_PRIMARY_LABELS[canonical];
    return {
      status: 'canonical',
      canonicalSlug: canonical,
      labelAr: input.taxonomyCategoryNameAr?.trim() || labels.ar,
      labelEn: input.taxonomyCategoryNameEn?.trim() || labels.en,
      legacySector,
    };
  }

  // 2. Legacy sector resolves through mapping.
  if (legacySector && legacySector !== 'other') {
    let resolved: string | null = null;
    if (isCanonicalPrimarySlug(legacySector)) resolved = legacySector;
    else {
      const mapped = LEGACY_SECTOR_TO_TAXONOMY_SLUG[legacySector];
      if (mapped && CANONICAL_SET.has(mapped)) resolved = mapped;
    }
    if (resolved) {
      const canonical = resolved as CanonicalPrimarySlug;
      const labels = CANONICAL_PRIMARY_LABELS[canonical];
      return {
        status: 'legacy_resolved',
        canonicalSlug: canonical,
        labelAr: labels.ar,
        labelEn: labels.en,
        legacySector,
      };
    }
  }

  // 3. Unclassified — preserve legacy sector verbatim in the label.
  return {
    status: 'unclassified',
    canonicalSlug: null,
    labelAr: legacySector
      ? `غير مصنف (قطاع قديم: ${legacySector})`
      : 'غير مصنف',
    labelEn: legacySector
      ? `Unclassified (legacy sector: ${legacySector})`
      : 'Unclassified',
    legacySector,
  };
}