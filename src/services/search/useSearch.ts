import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { listActiveCategories } from '@/modules/categories';
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
export const useCategories = () =>
  useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const { data } = await listActiveCategories({ select: '*' });
      return data ?? [];
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });

export const useCities = () =>
  useQuery({
    queryKey: ['cities'],
    queryFn: async () => {
      const { data } = await listActiveCities({ select: '*' });
      return data ?? [];
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });

export const useBusinesses = () =>
  useQuery({
    queryKey: ['businesses-all-with-services'],
    queryFn: async () => {
      const today = new Date().toISOString().slice(0, 10);
      const { data } = await supabase
        .from('businesses_public')
        .select('*, categories(id, name_ar, name_en, slug, icon, parent_id), cities(id, name_ar, name_en), business_services(name_ar, name_en, price_from, price_to, is_active, category_id), promotions(id, end_date)')
        .eq('is_active', true)
        // Only return active + non-expired service rows for tag chips & price filter
        .eq('business_services.is_active', true)
        // Only return live promotions for the "كوبون" badge (active and not expired)
        .eq('promotions.is_active', true)
        .or(`end_date.is.null,end_date.gte.${today}`, { foreignTable: 'promotions' })
        .order('rating_avg', { ascending: false })
        .limit(500);
      return data ?? [];
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });

export const useEntityTags = () =>
  useQuery({
    queryKey: ['entity-tags-businesses'],
    queryFn: async () => {
      const { data } = await supabase.from('entity_tags').select('entity_id, tag_id').eq('entity_type', 'business');
      return data ?? [];
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
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
  selectedTags: string[],
  entityTags: any[] | undefined,
  language: string,
  categories?: CategoryLite[],
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
      if (total > 0) scores.set(b.id, total);
      return total > 0;
    });
  }

  // Provider category filter — accept either UUID id or slug, and roll parents
  // down to include all child categories.
  if (filters.categoryId !== 'all') {
    const resolved = resolveCategory(filters.categoryId, categories);
    if (resolved && categories) {
      const allowed = expandCategoryIds(resolved, categories);
      results = results.filter((b) => allowed.has(b.category_id));
    } else {
      // Legacy fallback: categories tree not loaded yet — match by id or
      // embedded slug so legacy URLs still work during hydration.
      const v = filters.categoryId;
      results = results.filter((b) => b.category_id === v || (b as any).categories?.slug === v);
    }
  }

  // Service-category facet — provider has ≥1 active service whose
  // business_services.category_id matches (rollup to children when parent).
  if (filters.serviceCategoryId && filters.serviceCategoryId !== 'all') {
    const resolved = resolveCategory(filters.serviceCategoryId, categories);
    const allowed = resolved && categories ? expandCategoryIds(resolved, categories) : new Set<string>([filters.serviceCategoryId]);
    results = results.filter((b) => {
      const services = (b as any).business_services;
      if (!Array.isArray(services) || services.length === 0) return false;
      return services.some((s: { is_active?: boolean; category_id?: string | null }) =>
        s.is_active && s.category_id && allowed.has(s.category_id),
      );
    });
  }

  // City filter
  if (filters.cityId !== 'all') results = results.filter(b => b.city_id === filters.cityId);
  // Rating filter
  if (filters.minRating > 0) results = results.filter(b => Number(b.rating_avg) >= filters.minRating);
  // Verified filter
  if (filters.verifiedOnly) results = results.filter(b => b.is_verified);

  // Tags filter
  if (selectedTags.length > 0 && entityTags) {
    const bizIdsWithTags = new Set(
      entityTags.filter(et => selectedTags.includes(et.tag_id)).map(et => et.entity_id)
    );
    results = results.filter(b => bizIdsWithTags.has(b.id));
  }

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
