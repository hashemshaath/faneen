/**
 * Phase 5H — Admin Businesses Filters + List State extraction.
 *
 * Memoised derivations for the `/admin/businesses` list view:
 *   - `filtered`            — search/filter/sort applied to the raw list
 *   - `safePage` / `paged`  — clamped current page + sliced view
 *   - `totalPages`          — total page count under `pageSize`
 *   - `stats`               — aggregate KPI bag
 *   - `tierDistribution`    — counts per tier for the distribution strip
 *
 * Behaviour-preserving: every input/output mirrors the inline `useMemo`
 * blocks that previously lived in `AdminBusinesses.tsx`.
 */
import { useMemo } from 'react';
import {
  computeBusinessStats,
  computeTierDistribution,
  filterAndSortBusinesses,
  type BusinessListRow,
  type BusinessSort,
} from '@/pages/admin/businesses/businessListDerivations';
import type { TierMeta } from '@/pages/admin/businesses/_shared';

export interface AdminBusinessesListStateInputs<T extends BusinessListRow> {
  businesses: ReadonlyArray<T>;
  contractBusinessIds: ReadonlyArray<string>;
  tiers: ReadonlyArray<TierMeta>;
  search: string;
  filterStatus: string;
  selectedTiers: ReadonlyArray<string>;
  filterTranslation: string;
  filterOrigin: string;
  sortBy: BusinessSort;
  language: 'ar' | 'en';
  page: number;
  pageSize: number;
}

export interface AdminBusinessesListState<T extends BusinessListRow> {
  filtered: T[];
  totalPages: number;
  safePage: number;
  paged: T[];
  stats: ReturnType<typeof computeBusinessStats<T>>;
  tierDistribution: ReturnType<typeof computeTierDistribution<T>>;
}

export function useAdminBusinessesListState<T extends BusinessListRow>(
  inputs: AdminBusinessesListStateInputs<T>,
): AdminBusinessesListState<T> {
  const {
    businesses,
    contractBusinessIds,
    tiers,
    search,
    filterStatus,
    selectedTiers,
    filterTranslation,
    filterOrigin,
    sortBy,
    language,
    page,
    pageSize,
  } = inputs;

  const filtered = useMemo(
    () =>
      filterAndSortBusinesses(businesses, {
        search,
        filterStatus,
        selectedTiers,
        filterTranslation,
        filterOrigin,
        sortBy,
        language,
        contractBusinessIds,
      }),
    [
      businesses,
      search,
      filterStatus,
      selectedTiers,
      filterTranslation,
      filterOrigin,
      sortBy,
      language,
      contractBusinessIds,
    ],
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const paged = useMemo(
    () => filtered.slice((safePage - 1) * pageSize, safePage * pageSize),
    [filtered, safePage, pageSize],
  );

  const stats = useMemo(
    () => computeBusinessStats(businesses, contractBusinessIds),
    [businesses, contractBusinessIds],
  );

  const tierDistribution = useMemo(
    () => computeTierDistribution(businesses, tiers),
    [businesses, tiers],
  );

  return { filtered, totalPages, safePage, paged, stats, tierDistribution };
}