/**
 * Taxonomy usage indicators & legacy fallback usage report.
 *
 * All queries are batched (one SELECT per source, grouped client-side) so we
 * stay cheap regardless of how many categories exist. Each function is safe
 * to fail: a missing table or RLS denial returns an empty map / zeroed
 * report rather than throwing so the admin UI never breaks.
 */
import { supabase } from '@/integrations/supabase/client';
import type { TaxonomyCategory } from './types';

export interface TaxonomyUsageCounts {
  /** category_id -> number of business_taxonomy_categories rows */
  businesses: Map<string, number>;
  /** category_id -> number of showcase_submissions rows */
  showcase: Map<string, number>;
  /** category_id -> number of aliases */
  aliases: Map<string, number>;
  /** category_id -> number of relations (either side) */
  relations: Map<string, number>;
  /** category_id -> number of direct children */
  children: Map<string, number>;
}

function inc(map: Map<string, number>, key: string | null | undefined, by = 1) {
  if (!key) return;
  map.set(key, (map.get(key) ?? 0) + by);
}

async function safeSelect<T>(
  fn: () => Promise<{ data: T[] | null; error: unknown }>,
): Promise<T[]> {
  try {
    const { data, error } = await fn();
    if (error) return [];
    return data ?? [];
  } catch {
    return [];
  }
}

export async function getTaxonomyUsageCounts(
  categories: TaxonomyCategory[],
): Promise<TaxonomyUsageCounts> {
  const businesses = new Map<string, number>();
  const showcase = new Map<string, number>();
  const aliases = new Map<string, number>();
  const relations = new Map<string, number>();
  const children = new Map<string, number>();

  // children — derive locally, no network
  categories.forEach((c) => inc(children, c.parent_id));

  const [bRows, sRows, aRows, rRows] = await Promise.all([
    safeSelect<{ taxonomy_category_id: string | null }>(() =>
      supabase.from('business_taxonomy_categories').select('taxonomy_category_id'),
    ),
    safeSelect<{ taxonomy_category_id: string | null }>(() =>
      supabase.from('showcase_submissions').select('taxonomy_category_id'),
    ),
    safeSelect<{ category_id: string }>(() =>
      supabase.from('taxonomy_aliases').select('category_id'),
    ),
    safeSelect<{ category_id: string; related_category_id: string }>(() =>
      supabase
        .from('taxonomy_category_relations')
        .select('category_id,related_category_id'),
    ),
  ]);

  bRows.forEach((r) => inc(businesses, r.taxonomy_category_id));
  sRows.forEach((r) => inc(showcase, r.taxonomy_category_id));
  aRows.forEach((r) => inc(aliases, r.category_id));
  rRows.forEach((r) => {
    inc(relations, r.category_id);
    inc(relations, r.related_category_id);
  });

  return { businesses, showcase, aliases, relations, children };
}

export interface TaxonomyFallbackReport {
  /** businesses without any business_taxonomy_categories row */
  businessesWithoutTaxonomy: number;
  /** total businesses considered */
  businessesTotal: number;
  /** showcase_submissions with taxonomy_category_id IS NULL */
  showcaseWithoutTaxonomy: number;
  /** total showcase rows considered */
  showcaseTotal: number;
  /** when the report could not be computed (RLS / missing column), this is true and counts are zero */
  partial: boolean;
}

/**
 * Lightweight admin-only fallback usage report.
 * Used to know when legacy `sectors`/`sub_services` fields are safe to remove.
 */
export async function getTaxonomyFallbackReport(): Promise<TaxonomyFallbackReport> {
  let partial = false;

  // businesses with at least one taxonomy link
  const linkedBiz = await safeSelect<{ business_id: string }>(() =>
    supabase.from('business_taxonomy_categories').select('business_id'),
  );
  const linkedSet = new Set(linkedBiz.map((r) => r.business_id));

  const { count: businessesTotal, error: bErr } = await supabase
    .from('businesses')
    .select('id', { count: 'exact', head: true });
  if (bErr) partial = true;

  const businessesWithoutTaxonomy = Math.max(
    0,
    (businessesTotal ?? 0) - linkedSet.size,
  );

  const { count: showcaseTotal, error: sTotalErr } = await supabase
    .from('showcase_submissions')
    .select('id', { count: 'exact', head: true });
  if (sTotalErr) partial = true;

  const { count: showcaseMissing, error: sMissErr } = await supabase
    .from('showcase_submissions')
    .select('id', { count: 'exact', head: true })
    .is('taxonomy_category_id', null);
  if (sMissErr) partial = true;

  return {
    businessesWithoutTaxonomy,
    businessesTotal: businessesTotal ?? 0,
    showcaseWithoutTaxonomy: showcaseMissing ?? 0,
    showcaseTotal: showcaseTotal ?? 0,
    partial,
  };
}