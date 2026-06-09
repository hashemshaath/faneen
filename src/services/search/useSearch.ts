import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';
import { listActiveCities } from '@/modules/locations';

const HISTORY_KEY = 'qitaat_search_history';
const MAX_HISTORY = 10;
const LEGACY_HISTORY_KEYS = [
  'faneen_search_history',
  'faneen_searchHistory',
  'faneen_recent_searches',
  'faneen_history',
];

/**
 * Defensive cleanup: even though `main.tsx` wipes all `faneen_*` keys on
 * first load, we run a tiny per-call guard so the search history can NEVER
 * surface legacy data — e.g. if a tab opened before the cleanup ran, or if
 * someone restored an old backup. Idempotent and cheap (a flag short-circuits
 * after the first call).
 */
const LEGACY_PURGE_FLAG = 'qitaat_search_history_legacy_purged_v1';
let legacyPurgedThisSession = false;

const purgeLegacySearchHistory = () => {
  if (legacyPurgedThisSession) return;
  legacyPurgedThisSession = true;
  try {
    if (localStorage.getItem(LEGACY_PURGE_FLAG) === '1') return;
    for (const key of LEGACY_HISTORY_KEYS) {
      try { localStorage.removeItem(key); } catch { /* ignore */ }
      try { sessionStorage.removeItem(key); } catch { /* ignore */ }
    }
    // Also sweep any other faneen_* key whose name hints at search/history,
    // covering older variants we may have forgotten.
    try {
      const toRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith('faneen_') && /search|history|recent/i.test(k)) {
          toRemove.push(k);
        }
      }
      toRemove.forEach((k) => localStorage.removeItem(k));
    } catch { /* ignore */ }
    try { localStorage.setItem(LEGACY_PURGE_FLAG, '1'); } catch { /* ignore */ }
  } catch { /* storage unavailable */ }
};

/** Strict shape validation — rejects anything that isn't a clean string[]. */
const sanitizeHistory = (raw: unknown): string[] => {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of raw) {
    if (typeof item !== 'string') continue;
    const trimmed = item.trim();
    if (trimmed.length < 2 || trimmed.length > 200) continue;
    if (seen.has(trimmed)) continue;
    seen.add(trimmed);
    out.push(trimmed);
    if (out.length >= MAX_HISTORY) break;
  }
  return out;
};

// ─── Search History ────────────────────────────────────
export const getSearchHistory = (): string[] => {
  purgeLegacySearchHistory();
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    const clean = sanitizeHistory(parsed);
    // If the stored value was malformed, rewrite it cleanly so we never
    // re-validate the bad payload on every read.
    if (clean.length !== (Array.isArray(parsed) ? parsed.length : -1)) {
      try { localStorage.setItem(HISTORY_KEY, JSON.stringify(clean)); } catch { /* ignore */ }
    }
    return clean;
  } catch {
    // Corrupt JSON — wipe it so future reads don't keep throwing.
    try { localStorage.removeItem(HISTORY_KEY); } catch { /* ignore */ }
    return [];
  }
};

export const addToSearchHistory = (term: string) => {
  const trimmed = term.trim();
  if (trimmed.length < 2 || trimmed.length > 200) return;
  purgeLegacySearchHistory();
  const history = getSearchHistory().filter(h => h !== trimmed);
  history.unshift(trimmed);
  try { localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(0, MAX_HISTORY))); } catch { /* ignore */ }
};

export const removeFromSearchHistory = (term: string) => {
  const history = getSearchHistory().filter(h => h !== term);
  try { localStorage.setItem(HISTORY_KEY, JSON.stringify(history)); } catch { /* ignore */ }
};

export const clearSearchHistory = () => {
  purgeLegacySearchHistory();
  try { localStorage.removeItem(HISTORY_KEY); } catch { /* ignore */ }
};

// ─── Debounce Hook ─────────────────────────────────────
export const useDebouncedValue = <T>(value: T, delay = 300): T => {
  const [debounced, setDebounced] = useState(value);
  const timer = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    timer.current = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer.current);
  }, [value, delay]);

  return debounced;
};

// ─── Fuzzy Match Score ─────────────────────────────────
const fuzzyScore = (text: string, query: string): number => {
  if (!text || !query) return 0;
  const t = text.toLowerCase();
  const q = query.toLowerCase();

  // Exact match
  if (t === q) return 100;
  // Starts with
  if (t.startsWith(q)) return 90;
  // Word starts with
  const words = t.split(/\s+/);
  if (words.some(w => w.startsWith(q))) return 80;
  // Contains
  if (t.includes(q)) return 60;
  // Partial character match (typo tolerance)
  let score = 0;
  let qi = 0;
  for (let i = 0; i < t.length && qi < q.length; i++) {
    if (t[i] === q[qi]) { score += 10; qi++; }
  }
  return qi === q.length ? Math.min(score, 50) : 0;
};

// ─── "Did You Mean?" ───────────────────────────────────
export const getDidYouMean = (
  query: string,
  allNames: string[],
  threshold = 40
): string | null => {
  if (!query.trim() || query.length < 3) return null;
  let bestMatch = '';
  let bestScore = 0;

  for (const name of allNames) {
    const score = fuzzyScore(name, query);
    if (score > bestScore && score >= threshold && score < 90) {
      bestScore = score;
      bestMatch = name;
    }
  }
  return bestMatch || null;
};

// ─── Data Hooks ────────────────────────────────────────
/**
 * Phase 6 — taxonomy-only category tree for search.
 *
 * The legacy `categories` table is no longer queried from search. Instead we
 * pull `taxonomy_categories` (active + public + non-archived) and project them
 * into the same `{ id, slug, name_ar, name_en, parent_id, icon }` shape that
 * `filterAndSort` / Search.tsx already expect. This keeps:
 *   - `/search?category=<slug>` working (resolved via slug match)
 *   - `/search?sector=<legacy>` working (mapped to a taxonomy slug upstream
 *     in Search.tsx via LEGACY_SECTOR_TO_TAXONOMY_SLUG, then resolved here)
 *   - parent → child rollup, since taxonomy_categories carries `parent_id`
 *
 * Legacy `categories` table is intentionally NOT deleted; it just is no
 * longer read by the search layer.
 */
export const useCategories = () =>
  useQuery({
    queryKey: ['search:taxonomy-categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('taxonomy_categories')
        .select('id, slug, name_ar, name_en, parent_id, icon')
        .eq('is_active', true)
        .eq('is_public', true)
        .eq('is_archived', false);
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: 3,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 4000),
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
  });

export const useCities = () =>
  useQuery({
    queryKey: ['cities'],
    queryFn: async () => {
      const { data, error } = await listActiveCities<Database['public']['Tables']['cities']['Row']>({ select: '*' });
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: 3,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 4000),
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
  });

export const useBusinesses = () =>
  useQuery({
    queryKey: ['businesses-all-with-services'],
    queryFn: async () => {
      const today = new Date().toISOString().slice(0, 10);
      // Phase 18a — taxonomy-first parent select. The legacy
      // `businesses.category_id` column is no longer read by search; all
      // category resolution now goes through `business_taxonomy_categories`
      // (provider-level) and `business_service_taxonomy_categories`
      // (service-level), threaded into `filterAndSort` from upstream.
      // Allow-list kept tight (links/keys, display/sort/fuzzy, filters,
      // map markers, card chrome); triple-gate, ordering and limit unchanged.
      const PARENT_SELECT =
        'id, username, name_ar, name_en, description_ar, description_en, ' +
        'logo_url, cover_url, website, ' +
        'rating_avg, rating_count, is_verified, membership_tier, ' +
        'city_id, latitude, longitude, created_at';
      // Phase 18a: `business_services.category_id` is also removed from the
      // embedded select. Service-level taxonomy is resolved via
      // `business_service_taxonomy_categories` (see `useServiceCategoryBusinessIds`).
      const { data, error } = await supabase
        .from('businesses_public')
        .select(
          `${PARENT_SELECT}, cities(id, name_ar, name_en), business_services(id, name_ar, name_en, price_from, price_to, is_active, provider_status, admin_status), promotions(id, end_date)`,
        )
        .eq('is_active', true)
        // SERVICE-ACTIVATION-GOVERNANCE-3 — eligibility gate on nested
        // business_services rows: legacy is_active AND new governance
        // statuses must all align before a service is treated as public.
        .eq('business_services.is_active', true)
        .eq('business_services.provider_status', 'active')
        .eq('business_services.admin_status', 'allowed')
        // Only return live promotions for the "كوبون" badge (active and not expired)
        .eq('promotions.is_active', true)
        .or(`end_date.is.null,end_date.gte.${today}`, { foreignTable: 'promotions' })
        .order('rating_avg', { ascending: false })
        .limit(500);
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
    retry: 3,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 4000),
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
  });

const DIRECTORY_REALTIME_TABLES = [
  'directory_sync_events',
] as const;

const DIRECTORY_QUERY_KEYS: ReadonlyArray<ReadonlyArray<unknown>> = [
  ['businesses-all-with-services'],
  ['search:taxonomy-categories'],
  ['cities'],
  ['search-taxonomy-context'],
  ['business-taxonomy-display-batch'],
  ['search:service-category-business-ids'],
  ['home-category-row-businesses'],
];

export const useDirectoryRealtimeInvalidation = () => {
  const queryClient = useQueryClient();

  useEffect(() => {
    const invalidateDirectory = () => {
      for (const key of DIRECTORY_QUERY_KEYS) {
        queryClient.invalidateQueries({ queryKey: key as unknown[] });
      }
    };

    let channel = supabase.channel('qitaat-directory-live-sync');
    for (const table of DIRECTORY_REALTIME_TABLES) {
      channel = channel.on(
        'postgres_changes' as unknown as 'system',
        { event: '*', schema: 'public', table } as never,
        invalidateDirectory,
      );
    }
    channel.subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);
};

// Phase 19b — `useEntityTags` / `useTags` removed. The legacy `tags` and
// `entity_tags` tables were dropped. Search no longer offers tag facets; the
// taxonomy category and service-category filters are the only runtime path.

/**
 * Phase 18a — taxonomy-only resolver for the service-category facet.
 *
 * Given a UUID-or-slug filter value, resolves it against the taxonomy tree
 * (expanding parent → direct children), then walks
 * `business_service_taxonomy_categories → business_services` to produce the
 * set of business ids that have at least one ACTIVE service linked to any
 * of the allowed taxonomy categories.
 *
 * No reads from `business_services.category_id` or the legacy `categories`
 * table. Returns an empty set when the filter is "all" or unresolved so the
 * downstream filter narrows to zero rather than silently bypassing.
 */
export const useServiceCategoryBusinessIds = (
  serviceCategoryId: string,
  categories: CategoryLite[] | undefined,
) =>
  useQuery({
    queryKey: [
      'search:service-category-business-ids',
      serviceCategoryId,
      // Stable cache key — only depends on parent→child topology, not the
      // full category payload.
      (categories ?? []).map((c) => `${c.id}:${c.parent_id ?? ''}`).join(','),
    ],
    enabled: Boolean(serviceCategoryId) && serviceCategoryId !== 'all',
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    queryFn: async (): Promise<Set<string>> => {
      const resolved = resolveCategory(serviceCategoryId, categories);
      const allowedIds: string[] = resolved && categories
        ? [...expandCategoryIds(resolved, categories)]
        : [serviceCategoryId];
      if (allowedIds.length === 0) return new Set<string>();

      // One PostgREST round-trip: pull links + their service's business_id
      // + activation gate columns. Empty/inactive services are filtered out
      // client-side so we don't need a separate query.
      const { data, error } = await supabase
        .from('business_service_taxonomy_categories')
        .select(
          'service_id, category_id, business_services!inner(business_id, is_active, provider_status, admin_status)',
        )
        .in('category_id', allowedIds);
      if (error) throw error;

      const out = new Set<string>();
      for (const row of (data ?? []) as Array<{
        business_services: {
          business_id: string | null;
          is_active: boolean | null;
          provider_status: string | null;
          admin_status: string | null;
        } | null;
      }>) {
        const svc = row.business_services;
        if (!svc || !svc.business_id) continue;
        if (svc.is_active !== true) continue;
        if (svc.provider_status !== 'active') continue;
        if (svc.admin_status !== 'allowed') continue;
        out.add(svc.business_id);
      }
      return out;
    },
    retry: 3,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 4000),
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
  });

// ─── Filter + Sort Logic ──────────────────────────────
export interface SearchFilterValues {
  categoryId: string;
  cityId: string;
  minRating: number;
  verifiedOnly: boolean;
  sortBy: 'rating' | 'newest' | 'name' | 'relevance';
  priceMin: number;
  priceMax: number;
  /** Filter providers having at least one active service in this category. Accepts UUID or slug; resolved via the categories tree passed to filterAndSort. */
  serviceCategoryId: string;
  /** SA administrative region id (see `src/data/sa-regions.ts`). 'all' disables the facet. */
  regionId: string;
}

export const defaultFilters: SearchFilterValues = {
  categoryId: 'all',
  cityId: 'all',
  minRating: 0,
  verifiedOnly: false,
  sortBy: 'rating',
  priceMin: 0,
  priceMax: 0,
  serviceCategoryId: 'all',
  regionId: 'all',
};

/** Minimal category shape used for slug/UUID resolution and parent rollup. */
export interface CategoryLite {
  id: string;
  slug: string;
  parent_id: string | null;
}

/**
 * Resolve a filter value that may be either a category UUID or a slug into a
 * concrete category row. Returns null if unknown or 'all'.
 */
export const resolveCategory = (
  value: string | undefined,
  categories: CategoryLite[] | undefined,
): CategoryLite | null => {
  if (!value || value === 'all' || !categories || categories.length === 0) return null;
  return categories.find((c) => c.id === value) || categories.find((c) => c.slug === value) || null;
};

/**
 * Given a resolved category, return the set of category ids it should match:
 * - parent (no parent_id) → itself + all direct children
 * - child → itself only
 */
export const expandCategoryIds = (
  cat: CategoryLite,
  categories: CategoryLite[],
): Set<string> => {
  const ids = new Set<string>([cat.id]);
  if (cat.parent_id === null) {
    for (const c of categories) {
      if (c.parent_id === cat.id) ids.add(c.id);
    }
  }
  return ids;
};

export const filterAndSort = (
  businesses: any[],
  query: string,
  filters: SearchFilterValues,
  language: string,
  categories?: CategoryLite[],
  /**
   * Phase 18a — set of business ids that the central taxonomy mapped to
   * the active category filter (resolved upstream by
   * `useSearchTaxonomyContext`). This is now the SOLE source for the
   * provider-level category filter; legacy `businesses.category_id` is
   * no longer read.
   */
  taxonomyBusinessIds?: Set<string>,
  /**
   * Phase 18a — set of business ids that have at least one active service
   * linked to the active `serviceCategoryId` filter via
   * `business_service_taxonomy_categories` (resolved upstream by
   * `useServiceCategoryBusinessIds`). Sole source for the service-category
   * facet; legacy `business_services.category_id` is no longer read.
   */
  serviceCategoryBusinessIds?: Set<string>,
) => {
  let results = [...businesses];

  // Text search with scoring
  const scores = new Map<string, number>();
  if (query.trim()) {
    const q = query.toLowerCase();
    results = results.filter(b => {
      const nameScore = Math.max(
        fuzzyScore(b.name_ar || '', q),
        fuzzyScore(b.name_en || '', q),
      );
      const descScore = Math.max(
        fuzzyScore(b.description_ar || '', q),
        fuzzyScore(b.description_en || '', q),
      ) * 0.5;
      const total = Math.max(nameScore, descScore);
      // Taxonomy-resolved query: keep providers that matched the taxonomy
      // even when their text fields don't fuzzy-match the raw query.
      const taxBoost = taxonomyBusinessIds?.has(b.id) ? 1 : 0;
      const effective = Math.max(total, taxBoost);
      if (effective > 0) scores.set(b.id, effective);
      return effective > 0;
    });
  }

  // Provider category filter — Phase 18a: taxonomy-only.
  // `taxonomyBusinessIds` is resolved upstream from `business_taxonomy_categories`
  // (including parent → direct children rollup). Legacy `b.category_id` is
  // no longer consulted. When no taxonomy ids resolved (e.g. unmapped slug),
  // the filter intentionally returns an empty set rather than falling back
  // to legacy columns.
  if (filters.categoryId !== 'all') {
    const allowedBiz = taxonomyBusinessIds ?? new Set<string>();
    results = results.filter((b) => allowedBiz.has(b.id));
  }

  // Service-category facet — Phase 18a: taxonomy-only.
  // `serviceCategoryBusinessIds` is resolved upstream from
  // `business_service_taxonomy_categories` (with parent rollup). Legacy
  // `business_services.category_id` is no longer read.
  if (filters.serviceCategoryId && filters.serviceCategoryId !== 'all') {
    const allowedBiz = serviceCategoryBusinessIds ?? new Set<string>();
    results = results.filter((b) => allowedBiz.has(b.id));
  }

  // City filter
  if (filters.cityId !== 'all') results = results.filter(b => b.city_id === filters.cityId);
  // Rating filter
  if (filters.minRating > 0) results = results.filter(b => Number(b.rating_avg) >= filters.minRating);
  // Verified filter
  if (filters.verifiedOnly) results = results.filter(b => b.is_verified);

  // Price filter
  if (filters.priceMin > 0 || filters.priceMax > 0) {
    results = results.filter(b => {
      const services = b.business_services;
      if (!services || !Array.isArray(services) || services.length === 0) return false;
      return services.some((s) => {
        if (!s.is_active) return false;
        const from = Number(s.price_from) || 0;
        const to = Number(s.price_to) || from;
        const serviceMax = Math.max(from, to);
        const serviceMin = Math.min(from, to) || 0;
        if (filters.priceMin > 0 && serviceMax < filters.priceMin) return false;
        if (filters.priceMax > 0 && serviceMin > filters.priceMax) return false;
        return true;
      });
    });
  }

  // Sort
  const sortBy = query.trim() && filters.sortBy === 'rating' ? 'relevance' : filters.sortBy;
  results.sort((a, b) => {
    if (sortBy === 'relevance') {
      return (scores.get(b.id) || 0) - (scores.get(a.id) || 0);
    }
    if (sortBy === 'rating') return Number(b.rating_avg) - Number(a.rating_avg);
    if (sortBy === 'newest') return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    const nameA = language === 'ar' ? a.name_ar : (a.name_en || a.name_ar);
    const nameB = language === 'ar' ? b.name_ar : (b.name_en || b.name_ar);
    return nameA.localeCompare(nameB, language);
  });

  return results;
};
