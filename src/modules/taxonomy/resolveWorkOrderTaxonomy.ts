/**
 * Phase 4B — Pure helper that resolves the suggested taxonomy for a
 * work order from its linked sources. Does NOT read or write DB, does
 * NOT mutate work order state, and is NOT yet wired into production UI
 * or services. Caller is responsible for fetching the inputs.
 *
 * Priority (first match wins):
 *   1. contract_taxonomy_categories (contractTaxonomySlug)
 *   2. contract_templates.taxonomySlug (contractTemplateTaxonomySlug)
 *   3. quote_requests.taxonomy_category_id slug (quoteTaxonomySlug)
 *      + quote legacy `sector` resolved through legacy mapping
 *   4. project_taxonomy_categories (projectTaxonomySlug)
 *   5. WORK_TYPES.taxonomySlug (workTypeKey)
 *   6. legacy sector fallback (legacySector)
 *   7. unclassified
 */
import {
  CANONICAL_PRIMARY_LABELS,
  CANONICAL_PRIMARY_SLUGS,
  isCanonicalPrimarySlug,
  type CanonicalPrimarySlug,
} from './canonical-primaries';
import { LEGACY_SECTOR_TO_TAXONOMY_SLUG } from './legacy-mapping';
import { WORK_TYPES, type WorkTypeKey } from '@/lib/contract-work-types';

const CANONICAL_SET: Set<string> = new Set(CANONICAL_PRIMARY_SLUGS);

export type WorkOrderTaxonomyStatus = 'resolved' | 'fallback' | 'unclassified';

export type WorkOrderTaxonomySource =
  | 'contract_taxonomy'
  | 'contract_template'
  | 'quote_taxonomy'
  | 'project_taxonomy'
  | 'work_type'
  | 'legacy_sector'
  | 'none';

export interface WorkOrderTaxonomyInput {
  contractTaxonomySlug?: string | null;
  contractTemplateTaxonomySlug?: string | null;
  quoteTaxonomySlug?: string | null;
  quoteLegacySector?: string | null;
  projectTaxonomySlug?: string | null;
  workTypeKey?: WorkTypeKey | string | null;
  legacySector?: string | null;
}

export interface WorkOrderTaxonomyResolution {
  status: WorkOrderTaxonomyStatus;
  source: WorkOrderTaxonomySource;
  taxonomySlug: CanonicalPrimarySlug | null;
  labelAr?: string;
  labelEn?: string;
}

function normalize(value: string | null | undefined): string | null {
  if (!value) return null;
  const v = String(value).trim().toLowerCase();
  return v.length ? v : null;
}

function toCanonical(slug: string | null | undefined): CanonicalPrimarySlug | null {
  const v = normalize(slug);
  if (!v) return null;
  if (CANONICAL_SET.has(v)) return v as CanonicalPrimarySlug;
  return null;
}

function resolveLegacy(sector: string | null | undefined): CanonicalPrimarySlug | null {
  const v = normalize(sector);
  if (!v || v === 'other') return null;
  if (CANONICAL_SET.has(v)) return v as CanonicalPrimarySlug;
  const mapped = LEGACY_SECTOR_TO_TAXONOMY_SLUG[v];
  if (mapped && CANONICAL_SET.has(mapped)) return mapped as CanonicalPrimarySlug;
  return null;
}

function build(
  status: WorkOrderTaxonomyStatus,
  source: WorkOrderTaxonomySource,
  slug: CanonicalPrimarySlug,
): WorkOrderTaxonomyResolution {
  const labels = CANONICAL_PRIMARY_LABELS[slug];
  return {
    status,
    source,
    taxonomySlug: slug,
    labelAr: labels.ar,
    labelEn: labels.en,
  };
}

const WORK_TYPE_INDEX: Record<string, CanonicalPrimarySlug> = WORK_TYPES.reduce(
  (acc, w) => {
    acc[w.key] = w.taxonomySlug;
    return acc;
  },
  {} as Record<string, CanonicalPrimarySlug>,
);

export function resolveWorkOrderTaxonomy(
  input: WorkOrderTaxonomyInput,
): WorkOrderTaxonomyResolution {
  // 1. Contract taxonomy
  const c = toCanonical(input.contractTaxonomySlug);
  if (c) return build('resolved', 'contract_taxonomy', c);

  // 2. Contract template taxonomy
  const ct = toCanonical(input.contractTemplateTaxonomySlug);
  if (ct) return build('resolved', 'contract_template', ct);

  // 3. Quote taxonomy (FK slug or legacy quote sector)
  const q = toCanonical(input.quoteTaxonomySlug) ?? resolveLegacy(input.quoteLegacySector);
  if (q) return build('resolved', 'quote_taxonomy', q);

  // 4. Project taxonomy
  const p = toCanonical(input.projectTaxonomySlug);
  if (p) return build('resolved', 'project_taxonomy', p);

  // 5. Work type taxonomy
  const wKey = normalize(input.workTypeKey);
  if (wKey && WORK_TYPE_INDEX[wKey]) {
    return build('resolved', 'work_type', WORK_TYPE_INDEX[wKey]);
  }

  // 6. Legacy sector fallback
  const l = resolveLegacy(input.legacySector);
  if (l) return build('fallback', 'legacy_sector', l);

  // 7. Unclassified
  return { status: 'unclassified', source: 'none', taxonomySlug: null };
}
