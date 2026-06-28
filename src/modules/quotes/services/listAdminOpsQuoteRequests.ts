import { supabase } from '@/integrations/supabase/client';
import { resolveQuoteSectorTaxonomy } from '@/modules/taxonomy/resolveQuoteSectorTaxonomy';
import { legacyAliasesForTaxonomy } from '@/modules/taxonomy/legacy-mapping';

/**
 * L-2: list quote requests for AdminQuoteOperations.
 *
 * Phase 3E — FK-first read additive change:
 *   - select now also fetches `taxonomy_category_id` plus an embedded
 *     `taxonomy_category:taxonomy_categories(slug,name_ar,name_en)` join
 *     so the admin UI can render canonical taxonomy labels when present.
 *   - sector filter behavior is unchanged (`.eq('sector', sector)` when
 *     not 'all'). FK filtering is intentionally out of scope.
 *   - sorting, pagination, status filters and `sector` column are
 *     preserved for backward compatibility.
 *
 * Phase 3I — Dual filter (additive, filter-only):
 *   - When a non-'all' sector is supplied we resolve it to a canonical
 *     taxonomy slug and expand the filter to `.in('sector', [...aliases])`
 *     covering the selected slug + canonical + every legacy alias that
 *     maps to the same canonical. This keeps the old behavior (selected
 *     sector still included) while surfacing sibling-aliased rows.
 *   - Filtering stays on the `sector` column (no extra round-trip to
 *     resolve canonical → `taxonomy_category_id`). Dual-write in
 *     submit-quote-request keeps `sector` aligned with FK, so the
 *     FK-only edge case is not expected in practice.
 *   - When canonical cannot be resolved (e.g. `other`, unknown), we
 *     fall back to the original `.eq('sector', sector)` behavior.
 */
export interface AdminOpsQuoteRow {
  id: string;
  ref_id: string | null;
  sector: string;
  city: string;
  status: string;
  created_at: string;
  taxonomy_category_id: string | null;
  taxonomy_category: {
    slug: string | null;
    name_ar: string | null;
    name_en: string | null;
  } | null;
}

export const ADMIN_OPS_QUOTE_SELECT =
  'id, ref_id, sector, city, status, created_at, taxonomy_category_id, taxonomy_category:taxonomy_categories(slug,name_ar,name_en)';

export interface ListAdminOpsQuoteRequestsParams {
  fromDateIso: string | null;
  sector: string;
  limit?: number;
}

export async function listAdminOpsQuoteRequests({
  fromDateIso,
  sector,
  limit = 1000,
}: ListAdminOpsQuoteRequestsParams): Promise<AdminOpsQuoteRow[]> {
  let q = supabase
    .from('quote_requests')
    .select(ADMIN_OPS_QUOTE_SELECT)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (fromDateIso) q = q.gte('created_at', fromDateIso);
  if (sector !== 'all') {
    const canonical = resolveQuoteSectorTaxonomy({ sector });
    if (canonical) {
      const aliases = new Set<string>([sector, canonical, ...legacyAliasesForTaxonomy(canonical)]);
      q = q.in('sector', Array.from(aliases));
    } else {
      q = q.eq('sector', sector);
    }
  }
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as AdminOpsQuoteRow[];
}