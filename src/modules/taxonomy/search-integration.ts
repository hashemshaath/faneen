/**
 * Phase 7 — Search ↔ Taxonomy integration layer.
 *
 * "taxonomy-first, legacy-fallback":
 * - Resolve the user's input (sector / category / service / q) to a central
 *   `taxonomy_categories` row when possible.
 * - Look up `business_taxonomy_categories` (plus the resolved category's
 *   direct children, when it's a parent) to get the set of business IDs that
 *   should be augmented into the result set.
 * - The legacy `businesses.sectors` / `businesses.sub_services` / category_id
 *   filters remain in place untouched — taxonomy is purely additive at this
 *   stage so URLs and existing flows never regress.
 *
 * All Supabase reads are batched (no N+1) and cached via React Query.
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { TaxonomyCategory } from './types';
import {
  LEGACY_SECTOR_TO_TAXONOMY_SLUG,
  resolveLegacySectorToTaxonomy,
} from './legacy-mapping';
import { getRuntimeLegacyMapCached } from './migration-services';

export interface SearchTaxonomyParams {
  q?: string | null;
  sector?: string | null;
  category?: string | null;
  service?: string | null;
}

export interface SearchTaxonomyContext {
  resolvedCategory: TaxonomyCategory | null;
  /** Set of business ids that match the resolved category (or its children). */
  taxonomyBusinessIds: Set<string>;
  /** True when no taxonomy match was produced and callers should rely on legacy fields only. */
  shouldUseLegacyFallback: boolean;
  /** Localized label for debug / chips. */
  activeFilterLabel: string | null;
}

function norm(v: string | null | undefined): string {
  return (v ?? '').trim().toLowerCase();
}

/**
 * Collect all candidate slugs from a raw input. Prefers the runtime
 * `taxonomy_legacy_mappings` registry; static map is always merged as
 * a safety fallback so tests and offline flows never regress.
 */
async function collectCandidateSlugs(input: string): Promise<string[]> {
  const raw = input.trim();
  const n = norm(raw);
  let mapped = LEGACY_SECTOR_TO_TAXONOMY_SLUG[n];
  try {
    const runtime = await getRuntimeLegacyMapCached();
    if (runtime[n]) mapped = runtime[n];
  } catch {
    /* static fallback already applied */
  }
  return Array.from(new Set([raw, n, mapped].filter(Boolean) as string[]));
}

/**
 * Resolve a single input string to a public taxonomy category via:
 *   1. slug / legacy-mapped slug
 *   2. exact Arabic / English name
 *   3. alias (normalized) lookup
 * Returns `null` when nothing matches. Cheap queries first, bails early.
 */
export async function resolveSearchCategory(
  input: string | null | undefined,
): Promise<TaxonomyCategory | null> {
  if (!input) return null;
  const raw = input.trim();
  if (!raw) return null;

  // 1) slug / legacy mapping (runtime override + static fallback)
  const slugs = await collectCandidateSlugs(raw);
  const { data: bySlug } = await supabase
    .from('taxonomy_categories')
    .select('*')
    .in('slug', slugs)
    .eq('is_active', true)
    .eq('is_public', true)
    .eq('is_archived', false)
    .limit(1);
  if (bySlug && bySlug.length > 0) return bySlug[0] as TaxonomyCategory;

  // 2) name match
  const { data: byName } = await supabase
    .from('taxonomy_categories')
    .select('*')
    .or(`name_ar.eq.${raw},name_en.eq.${raw}`)
    .eq('is_active', true)
    .eq('is_public', true)
    .eq('is_archived', false)
    .limit(1);
  if (byName && byName.length > 0) return byName[0] as TaxonomyCategory;

  // 3) alias (normalized)
  const n = norm(raw);
  const { data: aliasRows } = await supabase
    .from('taxonomy_aliases')
    .select('category_id')
    .or(`normalized_alias.eq.${n},alias_ar.eq.${raw}`)
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

/**
 * Returns the set of business ids linked to the given category id (and its
 * direct children when the category is a parent). Performed in 2 round-trips
 * total regardless of the number of children — no N+1.
 */
export async function getTaxonomyBusinessIdsForCategory(
  categoryId: string,
): Promise<string[]> {
  if (!categoryId) return [];

  // Discover children (active+public only) in one query.
  const { data: children } = await supabase
    .from('taxonomy_categories')
    .select('id')
    .eq('parent_id', categoryId)
    .eq('is_active', true)
    .eq('is_archived', false);

  const ids = [categoryId, ...((children ?? []).map((c) => c.id))];

  const { data: links } = await supabase
    .from('business_taxonomy_categories')
    .select('business_id')
    .in('category_id', ids);

  const unique = new Set<string>();
  (links ?? []).forEach((l) => {
    if (l.business_id) unique.add(l.business_id);
  });
  return Array.from(unique);
}

/** Merge two id collections preserving order of the first, no duplicates. */
export function mergeTaxonomyAndLegacyBusinessIds(
  taxonomyIds: Iterable<string>,
  legacyIds: Iterable<string>,
): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const id of taxonomyIds) {
    if (id && !seen.has(id)) { seen.add(id); out.push(id); }
  }
  for (const id of legacyIds) {
    if (id && !seen.has(id)) { seen.add(id); out.push(id); }
  }
  return out;
}

export interface BusinessDisplayTaxonomy {
  /** Preferred display label — taxonomy name if available, else legacy first sector. */
  label: string | null;
  source: 'taxonomy' | 'legacy' | 'none';
}

export function getBusinessDisplayTaxonomy(
  business: {
    sectors?: string[] | null;
    taxonomy_primary_name_ar?: string | null;
    taxonomy_primary_name_en?: string | null;
  },
  language: 'ar' | 'en',
): BusinessDisplayTaxonomy {
  const tax = language === 'ar'
    ? business.taxonomy_primary_name_ar
    : (business.taxonomy_primary_name_en || business.taxonomy_primary_name_ar);
  if (tax && tax.trim()) return { label: tax, source: 'taxonomy' };
  const legacy = (business.sectors ?? []).find((s) => s && s.trim());
  if (legacy) return { label: legacy, source: 'legacy' };
  return { label: null, source: 'none' };
}

/**
 * Build a unified search context from URL params. Prefers an explicit
 * category/sector/service param; falls back to attempting a resolve on `q`
 * only when no other signal exists (so free-text queries still narrow).
 */
export async function buildSearchTaxonomyContext(
  params: SearchTaxonomyParams,
): Promise<SearchTaxonomyContext> {
  const candidates = [params.category, params.sector, params.service]
    .map((v) => (v ?? '').trim())
    .filter((v) => v && v !== 'all');

  let resolved: TaxonomyCategory | null = null;
  for (const c of candidates) {
    resolved = await resolveSearchCategory(c);
    if (resolved) break;
  }

  // Only try query resolution when no explicit category/sector matched.
  if (!resolved && params.q && params.q.trim().length >= 3) {
    resolved = await resolveSearchCategory(params.q);
  }

  if (!resolved) {
    // Legacy-only path: pass back the mapped slug for label, if any.
    const legacyMapped = candidates
      .map((c) => resolveLegacySectorToTaxonomy(c))
      .find(Boolean) ?? null;
    return {
      resolvedCategory: null,
      taxonomyBusinessIds: new Set<string>(),
      shouldUseLegacyFallback: true,
      activeFilterLabel: legacyMapped,
    };
  }

  const ids = await getTaxonomyBusinessIdsForCategory(resolved.id);
  return {
    resolvedCategory: resolved,
    taxonomyBusinessIds: new Set(ids),
    shouldUseLegacyFallback: ids.length === 0,
    activeFilterLabel: resolved.name_ar ?? resolved.slug,
  };
}

/** React Query hook — cached per (q, sector, category, service) tuple. */
export function useSearchTaxonomyContext(params: SearchTaxonomyParams) {
  return useQuery<SearchTaxonomyContext>({
    queryKey: [
      'search-taxonomy-context',
      params.q ?? '',
      params.sector ?? '',
      params.category ?? '',
      params.service ?? '',
    ],
    queryFn: () => buildSearchTaxonomyContext(params),
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    // Don't block the page on this — search must work even if taxonomy is slow.
    retry: 1,
    enabled: Boolean(
      (params.q && params.q.trim().length >= 3) ||
      (params.sector && params.sector !== 'all') ||
      (params.category && params.category !== 'all') ||
      (params.service && params.service !== 'all'),
    ),
  });
}

/**
 * Fetch the list of public taxonomy categories that are flagged to show in
 * search filters. Sorted by featured + sort_order. Used by SearchFilters to
 * replace / supplement the legacy sector list.
 */
export function useSearchableTaxonomyCategories() {
  return useQuery<TaxonomyCategory[]>({
    queryKey: ['search-taxonomy-categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('taxonomy_categories')
        .select('*')
        .eq('is_active', true)
        .eq('is_public', true)
        .eq('is_archived', false)
        .eq('show_in_search', true)
        .order('is_featured', { ascending: false })
        .order('sort_order', { ascending: true });
      if (error) throw error;
      return (data ?? []) as TaxonomyCategory[];
    },
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
}

// ────────────────────────────────────────────────────────────────
// Phase 10 — Bulk taxonomy display for business cards (no N+1).
// ────────────────────────────────────────────────────────────────

export interface BusinessTaxonomyDisplay {
  primaryLabel: string | null;
  primarySlug: string | null;
  secondaryLabels: string[];
  serviceLabels: string[];
  hasModernTaxonomy: boolean;
}

export const EMPTY_TAXONOMY_DISPLAY: BusinessTaxonomyDisplay = {
  primaryLabel: null,
  primarySlug: null,
  secondaryLabels: [],
  serviceLabels: [],
  hasModernTaxonomy: false,
};

interface RawLinkRow {
  business_id: string;
  category_id: string;
  role: string | null;
  is_primary: boolean | null;
  taxonomy_categories: {
    id: string;
    slug: string;
    name_ar: string;
    name_en: string | null;
    type_id: string | null;
  } | null;
}

function pickLabel(
  cat: { name_ar: string; name_en: string | null } | null,
  language: 'ar' | 'en',
): string | null {
  if (!cat) return null;
  if (language === 'ar') return cat.name_ar?.trim() || cat.name_en?.trim() || null;
  return cat.name_en?.trim() || cat.name_ar?.trim() || null;
}

/**
 * Build the display map from a list of joined rows. Pure — easy to test
 * and reuse from other batched callers (e.g. SSR or showcase later).
 */
export function formatBusinessTaxonomyDisplayMap(
  rows: RawLinkRow[],
  language: 'ar' | 'en',
): Map<string, BusinessTaxonomyDisplay> {
  const out = new Map<string, BusinessTaxonomyDisplay>();
  for (const row of rows) {
    const label = pickLabel(row.taxonomy_categories, language);
    if (!label) continue;
    const existing = out.get(row.business_id) ?? {
      primaryLabel: null,
      primarySlug: null,
      secondaryLabels: [] as string[],
      serviceLabels: [] as string[],
      hasModernTaxonomy: true,
    };
    const isPrimary =
      row.is_primary === true || row.role === 'primary_activity' || row.role === 'entity_type';
    if (isPrimary && !existing.primaryLabel) {
      existing.primaryLabel = label;
      existing.primarySlug = row.taxonomy_categories?.slug ?? null;
    } else if (row.role === 'service') {
      if (!existing.serviceLabels.includes(label)) existing.serviceLabels.push(label);
    } else {
      if (!existing.secondaryLabels.includes(label)) existing.secondaryLabels.push(label);
    }
    existing.hasModernTaxonomy = true;
    out.set(row.business_id, existing);
  }
  return out;
}

/**
 * Batched, cached fetch of taxonomy display info for a set of business IDs.
 * Two queries total (links + categories joined in one go via PostgREST embed),
 * regardless of N. Returns a Map keyed by business_id.
 */
export function useBusinessTaxonomyDisplayBatch(
  businessIds: string[],
  language: 'ar' | 'en',
) {
  const sortedKey = [...new Set(businessIds.filter(Boolean))].sort().join(',');
  return useQuery<Map<string, BusinessTaxonomyDisplay>>({
    queryKey: ['business-taxonomy-display-batch', language, sortedKey],
    enabled: sortedKey.length > 0,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    queryFn: async () => {
      const ids = sortedKey.split(',').filter(Boolean);
      if (ids.length === 0) return new Map();
      const { data, error } = await supabase
        .from('business_taxonomy_categories')
        .select(
          'business_id, category_id, role, is_primary, taxonomy_categories!inner(id, slug, name_ar, name_en, type_id)',
        )
        .in('business_id', ids);
      if (error) throw error;
      return formatBusinessTaxonomyDisplayMap((data ?? []) as unknown as RawLinkRow[], language);
    },
  });
}