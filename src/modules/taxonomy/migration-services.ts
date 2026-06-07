/**
 * Phase 8 — Taxonomy unification: migration registry services.
 *
 * Single entry point for everything related to the legacy → taxonomy
 * unification effort. Reads/writes `taxonomy_legacy_mappings`, computes
 * the inventory snapshot, and exposes the admin-only preview RPC.
 *
 * The runtime resolution path (search, showcase, sector pages) keeps
 * using the static fallback in `legacy-mapping.ts` until an admin has
 * verified the registry is complete. Nothing here mutates legacy data.
 */
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';
import { LEGACY_SECTOR_TO_TAXONOMY_SLUG } from './legacy-mapping';

export type LegacyMappingRow =
  Database['public']['Tables']['taxonomy_legacy_mappings']['Row'];

export type LegacyMappingStatus =
  | 'mapped' | 'pending' | 'needs_review' | 'ignored' | 'archived';

export type LegacyMappingConfidence =
  | 'exact' | 'high' | 'medium' | 'low' | 'manual_review';

export interface TaxonomyInventorySnapshot {
  taxonomyCategories: number;
  legacyCategories: number;
  legacyTags: number;
  businessesTotal: number;
  businessesWithLegacyOnly: number;
  businessesWithTaxonomy: number;
  servicesWithLegacyCategory: number;
  showcaseTotal: number;
  showcaseWithoutTaxonomy: number;
  quoteRequestsWithLegacySector: number;
  mappingsMapped: number;
  mappingsPending: number;
  mappingsNeedsReview: number;
  unusedTaxonomy: number;
}

/**
 * Builds the inventory in one round-trip per logical group. All counts are
 * head-only HEAD requests so this stays cheap even on large tables.
 */
export async function getTaxonomyInventory(): Promise<TaxonomyInventorySnapshot> {
  const headCount = async (table: string, build?: (q: ReturnType<typeof supabase.from>) => unknown) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let q: any = (supabase.from as any)(table).select('*', { count: 'exact', head: true });
    if (build) q = build(q);
    const { count } = await q;
    return count ?? 0;
  };

  const [
    taxonomyCategories,
    legacyCategories,
    legacyTags,
    businessesTotal,
    servicesWithLegacyCategory,
    showcaseTotal,
    showcaseWithoutTaxonomy,
    mappingRows,
  ] = await Promise.all([
    headCount('taxonomy_categories', (q) => q.eq('is_archived', false)),
    headCount('categories'),
    headCount('tags'),
    headCount('businesses'),
    headCount('business_services', (q) => q.not('category_id', 'is', null)),
    headCount('showcase_submissions'),
    headCount('showcase_submissions', (q) => q.is('taxonomy_category_id', null)),
    supabase
      .from('taxonomy_legacy_mappings')
      .select('mapping_status'),
  ]);

  // Distinct business_ids with a taxonomy link (cheap aggregate).
  const { data: linked } = await supabase
    .from('business_taxonomy_categories')
    .select('business_id');
  const linkedSet = new Set((linked ?? []).map((r) => r.business_id));
  const businessesWithTaxonomy = linkedSet.size;
  const businessesWithLegacyOnly = Math.max(0, businessesTotal - businessesWithTaxonomy);

  // Quote requests with a non-empty legacy sector value.
  const quoteRequestsWithLegacySector = await headCount(
    'quote_requests',
    (q) => q.not('sector', 'is', null).neq('sector', ''),
  );

  // Mapping status breakdown.
  let mappingsMapped = 0, mappingsPending = 0, mappingsNeedsReview = 0;
  for (const r of mappingRows.data ?? []) {
    if (r.mapping_status === 'mapped') mappingsMapped++;
    else if (r.mapping_status === 'pending') mappingsPending++;
    else if (r.mapping_status === 'needs_review') mappingsNeedsReview++;
  }

  // Unused taxonomy categories = categories not referenced in any link.
  const { data: allTaxIds } = await supabase
    .from('taxonomy_categories')
    .select('id')
    .eq('is_active', true)
    .eq('is_archived', false);
  const linkedCatIds = new Set<string>();
  const { data: linkedCats } = await supabase
    .from('business_taxonomy_categories')
    .select('category_id');
  for (const r of linkedCats ?? []) linkedCatIds.add(r.category_id);
  const unusedTaxonomy = (allTaxIds ?? []).filter((c) => !linkedCatIds.has(c.id)).length;

  return {
    taxonomyCategories,
    legacyCategories,
    legacyTags,
    businessesTotal,
    businessesWithLegacyOnly,
    businessesWithTaxonomy,
    servicesWithLegacyCategory,
    showcaseTotal,
    showcaseWithoutTaxonomy,
    quoteRequestsWithLegacySector,
    mappingsMapped,
    mappingsPending,
    mappingsNeedsReview,
    unusedTaxonomy,
  };
}

export async function listLegacyMappings(filters?: {
  status?: LegacyMappingStatus;
  source?: string;
}): Promise<LegacyMappingRow[]> {
  let q = supabase
    .from('taxonomy_legacy_mappings')
    .select('*')
    .order('legacy_source', { ascending: true })
    .order('legacy_slug', { ascending: true });
  if (filters?.status) q = q.eq('mapping_status', filters.status);
  if (filters?.source) q = q.eq('legacy_source', filters.source);
  const { data, error } = await q;
  if (error) throw error;
  return data ?? [];
}

export async function updateLegacyMapping(
  id: string,
  patch: Partial<Pick<LegacyMappingRow,
    'taxonomy_category_id' | 'mapping_status' | 'confidence' | 'notes'>>,
): Promise<void> {
  const { error } = await supabase
    .from('taxonomy_legacy_mappings')
    .update(patch)
    .eq('id', id);
  if (error) throw error;
}

export async function deleteLegacyMapping(id: string): Promise<void> {
  const { error } = await supabase
    .from('taxonomy_legacy_mappings')
    .delete()
    .eq('id', id);
  if (error) throw error;
}

export interface BackfillPreview {
  businesses_with_legacy_no_taxonomy: number;
  businesses_resolvable: number;
  business_services_with_legacy_category: number;
  showcase_without_taxonomy: number;
  quote_requests_with_legacy_sector: number;
  mappings_pending_review: number;
  mappings_total: number;
  generated_at: string;
}

export async function previewTaxonomyBackfill(): Promise<BackfillPreview> {
  const { data, error } = await supabase.rpc('preview_taxonomy_backfill');
  if (error) throw error;
  return data as unknown as BackfillPreview;
}

/**
 * Reads runtime legacy → taxonomy slug mappings. Tries the DB registry
 * first (the official source); falls back to the static map so existing
 * flows never break when the DB is unreachable or empty.
 */
export async function getRuntimeLegacyMap(): Promise<Record<string, string>> {
  try {
    const { data, error } = await supabase
      .from('taxonomy_legacy_mappings')
      .select('legacy_slug, mapping_status, taxonomy_category_id, taxonomy_categories!inner(slug)')
      .eq('mapping_status', 'mapped')
      .not('legacy_slug', 'is', null);
    if (error) throw error;
    const out: Record<string, string> = { ...LEGACY_SECTOR_TO_TAXONOMY_SLUG };
    for (const row of data ?? []) {
      const slug = (row as { taxonomy_categories: { slug: string } | null }).taxonomy_categories?.slug;
      const legacy = row.legacy_slug;
      if (slug && legacy) out[legacy] = slug;
    }
    return out;
  } catch {
    return { ...LEGACY_SECTOR_TO_TAXONOMY_SLUG };
  }
}