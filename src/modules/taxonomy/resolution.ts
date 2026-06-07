/**
 * Phase 4 — Taxonomy Resolution Layer.
 *
 * Centralized helpers that other modules (search, matching, showcase, SEO
 * pages) call to translate user input or legacy data into central taxonomy
 * categories. Everything is taxonomy-first with a legacy fallback so the
 * existing flows keep working until Phase 5 removes the old fields.
 */
import { supabase } from '@/integrations/supabase/client';
import type { TaxonomyCategory } from './types';
import {
  resolveLegacySectorToTaxonomy as resolveLegacySlug,
  LEGACY_SECTOR_TO_TAXONOMY_SLUG,
} from './legacy-mapping';
import {
  getBusinessTaxonomyCategories,
  type BusinessTaxonomyLink,
} from './business-services';

export { resolveLegacySlug as resolveLegacySectorToTaxonomy };
export { LEGACY_SECTOR_TO_TAXONOMY_SLUG };

function normalize(input: string): string {
  return input.trim().toLowerCase();
}

/**
 * Find a single category by slug, name_ar, alias, normalized alias, or
 * legacy mapping. Returns null when nothing matches. Tries cheapest lookups
 * first to keep query cost low.
 */
export async function resolveCategoryBySlugOrAlias(
  input: string,
): Promise<TaxonomyCategory | null> {
  if (!input) return null;
  const raw = input.trim();
  const norm = normalize(raw);

  // 1) Direct slug match (taxonomy slug or legacy slug routed through map).
  const candidateSlugs = Array.from(new Set([
    raw, norm,
    LEGACY_SECTOR_TO_TAXONOMY_SLUG[norm] ?? '',
  ].filter(Boolean)));

  const { data: bySlug } = await supabase
    .from('taxonomy_categories')
    .select('*')
    .in('slug', candidateSlugs)
    .eq('is_active', true)
    .eq('is_public', true)
    .eq('is_archived', false)
    .limit(1);
  if (bySlug && bySlug.length > 0) return bySlug[0] as TaxonomyCategory;

  // 2) Exact Arabic name match.
  const { data: byName } = await supabase
    .from('taxonomy_categories')
    .select('*')
    .or(`name_ar.eq.${raw},name_en.eq.${raw}`)
    .eq('is_active', true)
    .eq('is_public', true)
    .eq('is_archived', false)
    .limit(1);
  if (byName && byName.length > 0) return byName[0] as TaxonomyCategory;

  // 3) Alias lookup (normalized).
  const { data: aliasRows } = await supabase
    .from('taxonomy_aliases')
    .select('category_id')
    .or(`normalized_alias.eq.${norm},alias_ar.eq.${raw}`)
    .limit(1);
  if (aliasRows && aliasRows.length > 0) {
    const { data: cat } = await supabase
      .from('taxonomy_categories')
      .select('*')
      .eq('id', aliasRows[0].category_id)
      .eq('is_active', true)
      .eq('is_public', true)
      .eq('is_archived', false)
      .maybeSingle();
    if (cat) return cat as TaxonomyCategory;
  }

  return null;
}

export interface BusinessTaxonomySummary {
  entityType: BusinessTaxonomyLink | null;
  primaryActivity: BusinessTaxonomyLink | null;
  secondaryActivities: BusinessTaxonomyLink[];
  legacySectors: string[];
  legacySubServices: string[];
  hasTaxonomy: boolean;
}

export async function getBusinessTaxonomySummary(
  businessId: string,
  legacy?: { sectors?: string[] | null; sub_services?: string[] | null },
): Promise<BusinessTaxonomySummary> {
  const links = await getBusinessTaxonomyCategories(businessId);
  const entityType = links.find(l => l.role === 'entity_type') ?? null;
  const primaryActivity = links.find(l => l.role === 'primary_activity') ?? null;
  const secondaryActivities = links.filter(l => l.role === 'secondary_activity');
  return {
    entityType,
    primaryActivity,
    secondaryActivities,
    legacySectors: legacy?.sectors ?? [],
    legacySubServices: legacy?.sub_services ?? [],
    hasTaxonomy: links.length > 0,
  };
}

/**
 * Build a deduplicated lowercase token list that represents everything
 * searchable about a business — taxonomy names/slugs/aliases/keywords plus
 * legacy sectors/sub_services and basic identity fields. Pure function so
 * callers can cache it cheaply.
 */
export interface BusinessSearchTokenInput {
  name_ar?: string | null;
  name_en?: string | null;
  city?: string | null;
  district?: string | null;
  legacy_sectors?: string[] | null;
  legacy_sub_services?: string[] | null;
  taxonomy_categories?: Pick<TaxonomyCategory,
    'slug' | 'name_ar' | 'name_en' | 'keywords_ar' | 'keywords_en'
  >[];
  taxonomy_aliases?: string[];
}

export function buildBusinessSearchTokens(input: BusinessSearchTokenInput): string[] {
  const out: string[] = [];
  const push = (v: string | null | undefined) => {
    if (!v) return;
    const n = normalize(v);
    if (n && !out.includes(n)) out.push(n);
  };

  push(input.name_ar);
  push(input.name_en);
  push(input.city);
  push(input.district);
  (input.legacy_sectors ?? []).forEach(push);
  (input.legacy_sub_services ?? []).forEach(push);
  (input.taxonomy_aliases ?? []).forEach(push);
  (input.taxonomy_categories ?? []).forEach(c => {
    push(c.slug);
    push(c.name_ar);
    push(c.name_en);
    (c.keywords_ar ?? []).forEach(push);
    (c.keywords_en ?? []).forEach(push);
  });
  return out;
}

/**
 * Lightweight comparator used by client-side filters. Matches the input
 * against the category's slug, names, keywords, and (optionally) aliases
 * passed in alongside the category.
 */
export function categoryMatchesInput(
  category: Pick<TaxonomyCategory,
    'slug' | 'name_ar' | 'name_en' | 'keywords_ar' | 'keywords_en'
  > & { aliases?: string[] },
  input: string,
): boolean {
  if (!input) return false;
  const n = normalize(input);
  if (!n) return false;

  const candidates: string[] = [
    category.slug, category.name_ar, category.name_en ?? '',
    ...(category.keywords_ar ?? []),
    ...(category.keywords_en ?? []),
    ...(category.aliases ?? []),
  ];
  for (const c of candidates) {
    if (!c) continue;
    const cn = normalize(c);
    if (cn === n || cn.includes(n) || n.includes(cn)) return true;
  }
  return false;
}