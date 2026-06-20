import { useCallback, useEffect, useState } from 'react';
import type { SearchFilterValues } from './useSearch';

/**
 * Saved searches — client-only, persisted in localStorage. Each entry
 * snapshots the current query + filters so the user can re-run it later
 * and see a "+N new" badge when the live result count grows past what
 * they last saw.
 */
export const SAVED_SEARCHES_KEY = 'qitaat_saved_searches';
export const SAVED_SEARCHES_MAX = 12;
const EVENT = 'qitaat:saved-searches-changed';

export interface SavedSearch {
  id: string;
  name: string;
  query: string;
  filters: SearchFilterValues;
  createdAt: number;
  lastSeenCount: number;
}

const read = (): SavedSearch[] => {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(SAVED_SEARCHES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((x): x is SavedSearch => !!x && typeof x === 'object' && 'id' in x && 'filters' in x)
      .slice(0, SAVED_SEARCHES_MAX);
  } catch {
    return [];
  }
};

const write = (items: SavedSearch[]) => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(SAVED_SEARCHES_KEY, JSON.stringify(items));
    window.dispatchEvent(new CustomEvent(EVENT));
  } catch {
    /* ignore quota */
  }
};

export interface SavedSearchesApi {
  items: SavedSearch[];
  save: (input: { name: string; query: string; filters: SearchFilterValues; currentCount: number }) => SavedSearch | null;
  remove: (id: string) => void;
  markSeen: (id: string, currentCount: number) => void;
}

export const useSavedSearches = (): SavedSearchesApi => {
  const [items, setItems] = useState<SavedSearch[]>(() => read());

  useEffect(() => {
    const sync = () => setItems(read());
    window.addEventListener(EVENT, sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  const save = useCallback<SavedSearchesApi['save']>(({ name, query, filters, currentCount }) => {
    const trimmed = name.trim();
    if (!trimmed) return null;
    const current = read();
    if (current.length >= SAVED_SEARCHES_MAX) return null;
    const entry: SavedSearch = {
      id: `ss-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name: trimmed.slice(0, 60),
      query,
      filters,
      createdAt: Date.now(),
      lastSeenCount: Math.max(0, Math.floor(currentCount)),
    };
    write([entry, ...current]);
    return entry;
  }, []);

  const remove = useCallback((id: string) => {
    write(read().filter((x) => x.id !== id));
  }, []);

  const markSeen = useCallback((id: string, currentCount: number) => {
    const next = read().map((x) => (x.id === id ? { ...x, lastSeenCount: Math.max(0, Math.floor(currentCount)) } : x));
    write(next);
  }, []);

  return { items, save, remove, markSeen };
};

/**
 * Build the URL query string for a saved search so re-opening it
 * restores the exact filter set in `SearchV3`.
 */
export const buildSavedSearchHref = (entry: SavedSearch): string => {
  const p = new URLSearchParams();
  if (entry.query.trim()) p.set('q', entry.query.trim());
  const f = entry.filters;
  if (f.categoryId && f.categoryId !== 'all') p.set('category', f.categoryId);
  if (f.cityId && f.cityId !== 'all') p.set('city', f.cityId);
  if (f.regionId && f.regionId !== 'all') p.set('region', f.regionId);
  if (f.serviceCategoryId && f.serviceCategoryId !== 'all') p.set('serviceCategory', f.serviceCategoryId);
  if (f.minRating > 0) p.set('rating', String(f.minRating));
  if (f.verifiedOnly) p.set('verified', 'true');
  if (f.sortBy) p.set('sort', f.sortBy);
  return `/search?${p.toString()}`;
};