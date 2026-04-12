import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

const HISTORY_KEY = 'faneen_search_history';
const MAX_HISTORY = 10;

// ─── Search History ────────────────────────────────────
export const getSearchHistory = (): string[] => {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
  } catch {
    return [];
  }
};

export const addToSearchHistory = (term: string) => {
  if (!term.trim() || term.length < 2) return;
  const history = getSearchHistory().filter(h => h !== term);
  history.unshift(term);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(0, MAX_HISTORY)));
};

export const removeFromSearchHistory = (term: string) => {
  const history = getSearchHistory().filter(h => h !== term);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
};

export const clearSearchHistory = () => {
  localStorage.removeItem(HISTORY_KEY);
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
      const { data } = await supabase.from('categories').select('*').eq('is_active', true).order('sort_order');
      return data ?? [];
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });

export const useCities = () =>
  useQuery({
    queryKey: ['cities'],
    queryFn: async () => {
      const { data } = await supabase.from('cities').select('*').eq('is_active', true).order('name_ar');
      return data ?? [];
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });

export const useBusinesses = () =>
  useQuery({
    queryKey: ['businesses-all-with-services'],
    queryFn: async () => {
      const { data } = await supabase
        .from('businesses_public')
        .select('*, categories(*), cities(*), business_services(price_from, price_to, is_active)')
        .eq('is_active', true)
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
}

export const defaultFilters: SearchFilterValues = {
  categoryId: 'all',
  cityId: 'all',
  minRating: 0,
  verifiedOnly: false,
  sortBy: 'rating',
  priceMin: 0,
  priceMax: 0,
};

export const filterAndSort = (
  businesses: any[],
  query: string,
  filters: SearchFilterValues,
  selectedTags: string[],
  entityTags: any[] | undefined,
  language: string,
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

  // Category filter
  if (filters.categoryId !== 'all') results = results.filter(b => b.category_id === filters.categoryId);
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
      return services.some((s: any) => {
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
