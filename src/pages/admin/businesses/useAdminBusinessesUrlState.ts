/**
 * URL-derived state for `/admin/businesses`.
 *
 * Extracted from `AdminBusinesses.tsx` as a pure refactor — no behavior
 * change. Owns:
 *   - read-only filter values (search, status, tier(s), translation,
 *     origin, sort, page, viewMode)
 *   - typed setters that funnel through a single `updateParam` writer
 *   - debounced search input mirror (300ms) with stable refs so the
 *     effect only reschedules on input change
 *   - command-bar preset mapping (`applyBusinessesPreset` /
 *     `activeBusinessesPreset`)
 *   - `PAGE_SIZE` constant
 *
 * Nothing here touches the database, RFQ logic, permissions, or the
 * `/admin/businesses` route itself.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { BusinessesCommandPreset } from '@/components/admin/businesses/control-center/BusinessesCommandBar';

export type AdminBusinessesSort = 'recent' | 'rating' | 'name' | 'tier';
export type AdminBusinessesViewMode = 'cards' | 'table';

export const ADMIN_BUSINESSES_PAGE_SIZE = 20;

export interface UseAdminBusinessesUrlState {
  // raw URLSearchParams (preserved for callers that need full control)
  searchParams: URLSearchParams;
  setSearchParams: ReturnType<typeof useSearchParams>[1];

  // values
  search: string;
  searchInput: string;
  filterStatus: string;
  filterTier: string;
  selectedTiers: string[];
  filterTranslation: string;
  filterOrigin: string;
  sortBy: AdminBusinessesSort;
  page: number;
  viewMode: AdminBusinessesViewMode;

  // setters
  updateParam: (updates: Record<string, string | null>) => void;
  setSearchInput: (v: string) => void;
  setSearch: (v: string) => void;
  setFilterStatus: (v: string) => void;
  setFilterTier: (v: string) => void;
  toggleTier: (value: string) => void;
  clearTiers: () => void;
  setFilterTranslation: (v: string) => void;
  setFilterOrigin: (v: string) => void;
  setSortBy: (v: string) => void;
  setViewMode: (v: AdminBusinessesViewMode) => void;
  setPage: (n: number) => void;

  // command-bar presets
  applyBusinessesPreset: (key: BusinessesCommandPreset) => void;
  activeBusinessesPreset: BusinessesCommandPreset;

  // constants
  PAGE_SIZE: number;
}

export function useAdminBusinessesUrlState(): UseAdminBusinessesUrlState {
  const [searchParams, setSearchParams] = useSearchParams();
  const search = searchParams.get('q') || '';
  const filterStatus = searchParams.get('status') || 'all';
  const filterTier = searchParams.get('tier') || 'all';
  const filterTranslation = searchParams.get('translation') || 'all';
  const filterOrigin = searchParams.get('origin') || 'all';
  const sortBy = (searchParams.get('sort') || 'recent') as AdminBusinessesSort;
  const page = parseInt(searchParams.get('page') || '1', 10) || 1;
  const viewMode = (searchParams.get('view') || 'cards') as AdminBusinessesViewMode;

  const updateParam = useCallback(
    (updates: Record<string, string | null>) => {
      const sp = new URLSearchParams(searchParams);
      Object.entries(updates).forEach(([k, v]) => {
        if (v === null || v === '' || v === 'all') sp.delete(k);
        else sp.set(k, v);
      });
      setSearchParams(sp, { replace: false });
    },
    [searchParams, setSearchParams],
  );

  const [searchInput, setSearchInput] = useState(search);
  useEffect(() => {
    setSearchInput(search);
  }, [search]);

  // Latest refs so the 300ms debounce reschedules ONLY on input change,
  // matching prior behavior without an exhaustive-deps suppression.
  const latestSearchRef = useRef(search);
  const updateParamRef = useRef(updateParam);
  useEffect(() => {
    latestSearchRef.current = search;
  }, [search]);
  useEffect(() => {
    updateParamRef.current = updateParam;
  }, [updateParam]);
  useEffect(() => {
    const t = setTimeout(() => {
      if (searchInput !== latestSearchRef.current) {
        updateParamRef.current({ q: searchInput || null, page: null });
      }
    }, 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  const selectedTiers = useMemo(
    () => (filterTier === 'all' ? [] : filterTier.split(',').filter(Boolean)),
    [filterTier],
  );

  const setFilterStatus = useCallback(
    (v: string) => updateParam({ status: v === 'all' ? null : v, page: null }),
    [updateParam],
  );
  const setFilterTier = useCallback(
    (v: string) => updateParam({ tier: v === 'all' ? null : v, page: null }),
    [updateParam],
  );
  const toggleTier = useCallback(
    (value: string) => {
      const next = new Set(selectedTiers);
      if (next.has(value)) next.delete(value);
      else next.add(value);
      const arr = Array.from(next);
      updateParam({ tier: arr.length === 0 ? null : arr.join(','), page: null });
    },
    [selectedTiers, updateParam],
  );
  const clearTiers = useCallback(
    () => updateParam({ tier: null, page: null }),
    [updateParam],
  );
  const setFilterTranslation = useCallback(
    (v: string) => updateParam({ translation: v === 'all' ? null : v, page: null }),
    [updateParam],
  );
  const setFilterOrigin = useCallback(
    (v: string) => updateParam({ origin: v === 'all' ? null : v, page: null }),
    [updateParam],
  );
  const setSortBy = useCallback(
    (v: string) => updateParam({ sort: v === 'recent' ? null : v }),
    [updateParam],
  );
  const setViewMode = useCallback(
    (v: AdminBusinessesViewMode) =>
      updateParam({ view: v === 'cards' ? null : v }),
    [updateParam],
  );
  const setSearch = useCallback((v: string) => {
    setSearchInput(v);
  }, []);
  const setPage = useCallback(
    (n: number) => updateParam({ page: n <= 1 ? null : String(n) }),
    [updateParam],
  );

  const applyBusinessesPreset = useCallback(
    (key: BusinessesCommandPreset) => {
      const patch: Record<string, string | null> = { page: null };
      if (key === 'all') {
        patch.status = null;
        patch.origin = null;
      } else if (key === 'pilotReady') {
        patch.status = 'active';
        patch.origin = 'production';
      } else if (key === 'pendingReview') {
        patch.status = 'pending';
      } else if (key === 'missingContact') {
        patch.status = 'missing_contact';
      } else if (key === 'missingPublicLink') {
        patch.status = 'missing_username';
      } else if (key === 'inactive') {
        patch.status = 'inactive';
      } else if (key === 'demo') {
        patch.origin = 'demo';
      }
      updateParam(patch);
    },
    [updateParam],
  );

  const activeBusinessesPreset: BusinessesCommandPreset =
    filterOrigin === 'demo'
      ? 'demo'
      : filterStatus === 'pending'
        ? 'pendingReview'
        : filterStatus === 'missing_contact'
          ? 'missingContact'
          : filterStatus === 'missing_username'
            ? 'missingPublicLink'
            : filterStatus === 'inactive'
              ? 'inactive'
              : filterStatus === 'active' && filterOrigin === 'production'
                ? 'pilotReady'
                : 'all';

  return {
    searchParams,
    setSearchParams,
    search,
    searchInput,
    filterStatus,
    filterTier,
    selectedTiers,
    filterTranslation,
    filterOrigin,
    sortBy,
    page,
    viewMode,
    updateParam,
    setSearchInput,
    setSearch,
    setFilterStatus,
    setFilterTier,
    toggleTier,
    clearTiers,
    setFilterTranslation,
    setFilterOrigin,
    setSortBy,
    setViewMode,
    setPage,
    applyBusinessesPreset,
    activeBusinessesPreset,
    PAGE_SIZE: ADMIN_BUSINESSES_PAGE_SIZE,
  };
}