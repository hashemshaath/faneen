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
  const c = async (n: number | null | undefined) => n ?? 0;
  const [
    taxonomyCategories,
    businessesTotal,
    showcaseTotal,
    showcaseWithoutTaxonomy,
    mappingRows,
  ] = await Promise.all([
    supabase.from('taxonomy_categories').select('*', { count: 'exact', head: true }).eq('is_archived', false).then((r) => c(r.count)),
    supabase.from('businesses').select('*', { count: 'exact', head: true }).then((r) => c(r.count)),
    supabase.from('showcase_submissions').select('*', { count: 'exact', head: true }).then((r) => c(r.count)),
    supabase.from('showcase_submissions').select('*', { count: 'exact', head: true }).is('taxonomy_category_id', null).then((r) => c(r.count)),
    supabase.from('taxonomy_legacy_mappings').select('mapping_status'),
  ]);

  // Phase 19c — legacy `public.categories` table dropped and
  // `business_services.category_id` removed in Phase 18i/18h. Surface
  // zeros to keep the inventory snapshot shape stable for callers.
  const legacyCategories = 0;
  const servicesWithLegacyCategory = 0;

  // Phase 19b — legacy `tags` table dropped; surface 0 to keep the
  // inventory shape stable for any UI still consuming this snapshot.
  const legacyTags = 0;

  // Distinct business_ids with a taxonomy link (cheap aggregate).
  const { data: linked } = await supabase
    .from('business_taxonomy_categories')
    .select('business_id');
  const linkedSet = new Set((linked ?? []).map((r) => r.business_id));
  const businessesWithTaxonomy = linkedSet.size;
  const businessesWithLegacyOnly = Math.max(0, businessesTotal - businessesWithTaxonomy);

  // Quote requests with a non-empty legacy sector value.
  const { count: qrCount } = await supabase
    .from('quote_requests')
    .select('*', { count: 'exact', head: true })
    .not('sector', 'is', null)
    .neq('sector', '');
  const quoteRequestsWithLegacySector = qrCount ?? 0;

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
  businesses_already_linked?: number;
  business_services_with_legacy_category: number;
  showcase_without_taxonomy: number;
  showcase_resolvable?: number;
  quote_requests_with_legacy_sector: number;
  mappings_pending_review: number;
  mappings_total: number;
  mappings_ready?: number;
  sample?: Array<{
    record_type: 'business' | 'showcase';
    record_id: string;
    legacy_value: string | null;
    source: string;
    target_slug: string;
    target_name_ar: string | null;
  }>;
  generated_at: string;
}

export async function previewTaxonomyBackfill(): Promise<BackfillPreview> {
  const { data, error } = await supabase.rpc('preview_taxonomy_backfill');
  if (error) throw error;
  return data as unknown as BackfillPreview;
}

export interface BackfillApplyResult {
  businesses_linked: number;
  showcase_linked: number;
  skipped_existing: number;
  skipped_needs_review: number;
  errors: unknown[];
  applied_at: string;
}

/**
 * Admin-only. Executes the safe backfill RPC. The RPC itself enforces the
 * admin check and only acts on `mapped` registry rows; it never overwrites
 * existing taxonomy links or deletes legacy data.
 */
export async function applyTaxonomyBackfill(): Promise<BackfillApplyResult> {
  const { data, error } = await supabase.rpc('apply_taxonomy_backfill');
  if (error) throw error;
  return data as unknown as BackfillApplyResult;
}

// --- Secondary-activity backfill --------------------------------------------

export interface SecondaryBackfillPreviewRow {
  business_id: string;
  name_ar: string | null;
  sectors: string[] | null;
  primary_slug: string | null;
  linked_targets: string[] | null;
  resolvable_extras: Array<{
    legacy_value: string;
    target_slug: string | null;
    mapping_status: string;
    role_suggested: string;
  }> | null;
  needs_review_values: string[] | null;
}

export interface SecondaryBackfillPreview {
  totals: {
    secondary_resolvable: number;
    services_resolvable: number;
    already_linked_extras: number;
    needs_review_values: number;
    businesses_with_legacy: number;
  };
  rows: SecondaryBackfillPreviewRow[];
  generated_at: string;
}

export async function previewBusinessSecondaryBackfill(): Promise<SecondaryBackfillPreview> {
  const { data, error } = await supabase.rpc('preview_business_secondary_taxonomy_backfill');
  if (error) throw error;
  return data as unknown as SecondaryBackfillPreview;
}

export interface SecondaryBackfillApplyResult {
  secondary_linked: number;
  services_linked: number;
  skipped_existing: number;
  skipped_needs_review: number;
  errors: unknown[];
  applied_at: string;
}

export async function applyBusinessSecondaryBackfill(): Promise<SecondaryBackfillApplyResult> {
  const { data, error } = await supabase.rpc('apply_business_secondary_taxonomy_backfill');
  if (error) throw error;
  return data as unknown as SecondaryBackfillApplyResult;
}

// --- Runtime legacy map cache ------------------------------------------------
// Cached for 60s to avoid hitting the registry on every search/resolve call.
// Falls back to the static map on any failure.

let _runtimeMapCache: { value: Record<string, string>; expires: number } | null = null;
const RUNTIME_MAP_TTL_MS = 60_000;

export async function getRuntimeLegacyMapCached(
  opts: { force?: boolean } = {},
): Promise<Record<string, string>> {
  const now = Date.now();
  if (!opts.force && _runtimeMapCache && _runtimeMapCache.expires > now) {
    return _runtimeMapCache.value;
  }
  const value = await getRuntimeLegacyMap();
  _runtimeMapCache = { value, expires: now + RUNTIME_MAP_TTL_MS };
  return value;
}

export function clearRuntimeLegacyMapCache(): void {
  _runtimeMapCache = null;
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