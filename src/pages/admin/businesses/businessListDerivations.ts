/**
 * Pure derivations for the `/admin/businesses` list (filter, sort,
 * stats, tier distribution, translation completeness).
 *
 * Extracted from `AdminBusinesses.tsx` as a behavior-preserving refactor.
 * Each helper is a pure function over plain rows — no React, no I/O.
 */

export interface BusinessTranslationFields {
  name_ar?: unknown;
  name_en?: unknown;
  short_description_ar?: unknown;
  short_description_en?: unknown;
  description_ar?: unknown;
  description_en?: unknown;
}

export interface TranslationCompleteness {
  ar: boolean;
  en: boolean;
  full: boolean;
}

export function computeTranslationCompleteness(
  b: BusinessTranslationFields,
): TranslationCompleteness {
  const ar = Boolean(b.name_ar && b.short_description_ar && b.description_ar);
  const en = Boolean(b.name_en && b.short_description_en && b.description_en);
  return { ar, en, full: ar && en };
}

export interface BusinessListRow extends BusinessTranslationFields {
  id: string;
  username?: string | null;
  ref_id?: string | null;
  email?: string | null;
  phone?: string | null;
  is_active?: boolean | null;
  is_verified?: boolean | null;
  is_demo?: boolean | null;
  membership_tier?: string | null;
  rating_avg?: number | null;
  created_at: string;
}

export type BusinessSort = 'recent' | 'rating' | 'name' | 'tier';

export interface BusinessFilterInputs {
  search: string;
  filterStatus: string;
  selectedTiers: ReadonlyArray<string>;
  filterTranslation: string;
  filterOrigin: string;
  sortBy: BusinessSort;
  language: 'ar' | 'en';
  contractBusinessIds: ReadonlyArray<string>;
}

const TIER_RANK: Readonly<Record<string, number>> = {
  enterprise: 0,
  premium: 1,
  basic: 2,
  free: 3,
};

export function filterAndSortBusinesses<T extends BusinessListRow>(
  businesses: ReadonlyArray<T>,
  inputs: BusinessFilterInputs,
): T[] {
  const {
    search,
    filterStatus,
    selectedTiers,
    filterTranslation,
    filterOrigin,
    sortBy,
    language,
    contractBusinessIds,
  } = inputs;
  const q = search.trim().toLowerCase();
  const arr = businesses.filter((b) => {
    const matchSearch =
      !q ||
      b.name_ar?.toString().toLowerCase().includes(q) ||
      b.name_en?.toString().toLowerCase().includes(q) ||
      b.username?.toLowerCase().includes(q) ||
      b.ref_id?.toLowerCase().includes(q) ||
      b.email?.toLowerCase().includes(q) ||
      b.phone?.toLowerCase().includes(q);
    const matchStatus =
      filterStatus === 'all' ||
      (filterStatus === 'verified' && b.is_verified) ||
      (filterStatus === 'unverified' && !b.is_verified) ||
      (filterStatus === 'inactive' && !b.is_active) ||
      (filterStatus === 'contract' && contractBusinessIds.includes(b.id));
    const matchTier =
      selectedTiers.length === 0 ||
      (b.membership_tier ? selectedTiers.includes(b.membership_tier) : false);
    const matchOrigin =
      filterOrigin === 'all' ||
      (filterOrigin === 'demo' && b.is_demo === true) ||
      (filterOrigin === 'production' && !b.is_demo);
    const tc = computeTranslationCompleteness(b);
    const matchTrans =
      filterTranslation === 'all' ||
      (filterTranslation === 'missing_en' && !tc.en) ||
      (filterTranslation === 'missing_ar' && !tc.ar) ||
      (filterTranslation === 'complete' && tc.full);
    return matchSearch && matchStatus && matchTier && matchTrans && matchOrigin;
  });
  const sorted = [...arr];
  sorted.sort((a, b) => {
    switch (sortBy) {
      case 'rating':
        return (b.rating_avg || 0) - (a.rating_avg || 0);
      case 'name': {
        const an =
          (language === 'ar'
            ? (a.name_ar as string | undefined)
            : (a.name_en as string | undefined) ?? (a.name_ar as string | undefined)) || '';
        const bn =
          (language === 'ar'
            ? (b.name_ar as string | undefined)
            : (b.name_en as string | undefined) ?? (b.name_ar as string | undefined)) || '';
        return an.localeCompare(bn, language === 'ar' ? 'ar' : 'en');
      }
      case 'tier':
        return (
          (TIER_RANK[a.membership_tier ?? ''] ?? 9) -
          (TIER_RANK[b.membership_tier ?? ''] ?? 9)
        );
      default:
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    }
  });
  return sorted;
}

export interface BusinessStats {
  total: number;
  verified: number;
  active: number;
  contracts: number;
  premium: number;
}

export function computeBusinessStats<T extends BusinessListRow>(
  businesses: ReadonlyArray<T>,
  contractBusinessIds: ReadonlyArray<string>,
): BusinessStats {
  return {
    total: businesses.length,
    verified: businesses.filter((b) => b.is_verified).length,
    active: businesses.filter((b) => b.is_active).length,
    contracts: contractBusinessIds.length,
    premium: businesses.filter(
      (b) =>
        b.membership_tier === 'premium' || b.membership_tier === 'enterprise',
    ).length,
  };
}

export function computeTierDistribution<T extends BusinessListRow>(
  businesses: ReadonlyArray<T>,
  tiers: ReadonlyArray<{ value: string }>,
): Record<string, number> {
  const dist: Record<string, number> = {};
  tiers.forEach((t) => {
    dist[t.value] = businesses.filter((b) => b.membership_tier === t.value).length;
  });
  return dist;
}