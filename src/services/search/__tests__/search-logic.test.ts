import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  filterAndSort,
  getDidYouMean,
  getSearchHistory,
  addToSearchHistory,
  removeFromSearchHistory,
  clearSearchHistory,
  defaultFilters,
  type SearchFilterValues,
} from '../useSearch';

// ─── Mock localStorage ────────────────────────────────
const store: Record<string, string> = {};
beforeEach(() => {
  Object.keys(store).forEach(k => delete store[k]);
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => store[k] ?? null,
    setItem: (k: string, v: string) => { store[k] = v; },
    removeItem: (k: string) => { delete store[k]; },
  });
});

// ─── Sample data ──────────────────────────────────────
const biz = (overrides: Partial<any> = {}) => ({
  id: crypto.randomUUID(),
  name_ar: 'مصنع الألمنيوم',
  name_en: 'Aluminum Factory',
  description_ar: 'وصف',
  description_en: 'description',
  category_id: 'cat-1',
  city_id: 'city-1',
  rating_avg: '4.5',
  rating_count: 10,
  is_verified: true,
  is_active: true,
  membership_tier: 'basic',
  created_at: '2025-01-01',
  business_services: [],
  ...overrides,
});

// ─── Search History ───────────────────────────────────
describe('Search History', () => {
  it('adds and retrieves history', () => {
    addToSearchHistory('ألمنيوم');
    addToSearchHistory('حديد');
    expect(getSearchHistory()).toEqual(['حديد', 'ألمنيوم']);
  });

  it('deduplicates entries', () => {
    addToSearchHistory('زجاج');
    addToSearchHistory('خشب');
    addToSearchHistory('زجاج');
    expect(getSearchHistory()).toEqual(['زجاج', 'خشب']);
  });

  it('limits to 10 entries', () => {
    for (let i = 0; i < 15; i++) addToSearchHistory(`term-${i}`);
    expect(getSearchHistory()).toHaveLength(10);
  });

  it('ignores short or empty terms', () => {
    addToSearchHistory('');
    addToSearchHistory('a');
    addToSearchHistory('  ');
    expect(getSearchHistory()).toEqual([]);
  });

  it('removes specific entry', () => {
    addToSearchHistory('one');
    addToSearchHistory('two');
    removeFromSearchHistory('one');
    expect(getSearchHistory()).toEqual(['two']);
  });

  it('clears all history', () => {
    addToSearchHistory('test');
    clearSearchHistory();
    expect(getSearchHistory()).toEqual([]);
  });
});

// ─── Did You Mean ─────────────────────────────────────
describe('getDidYouMean', () => {
  const names = ['Aluminum Factory', 'Iron Works', 'Glass Solutions'];

  it('returns null for exact or near-exact matches', () => {
    expect(getDidYouMean('Aluminum Factory', names)).toBeNull();
  });

  it('suggests a close match', () => {
    const result = getDidYouMean('Alumnum', names);
    expect(result).toBe('Aluminum Factory');
  });

  it('returns null for very short queries', () => {
    expect(getDidYouMean('ab', names)).toBeNull();
  });

  it('returns null when no match found', () => {
    expect(getDidYouMean('xyzxyzxyz', names)).toBeNull();
  });
});

// ─── Filter & Sort ────────────────────────────────────
describe('filterAndSort', () => {
  const businesses = [
    biz({ id: '1', name_ar: 'مصنع أ', name_en: 'Factory A', rating_avg: '5', category_id: 'cat-1', city_id: 'city-1', is_verified: true }),
    biz({ id: '2', name_ar: 'مصنع ب', name_en: 'Factory B', rating_avg: '3', category_id: 'cat-2', city_id: 'city-2', is_verified: false }),
    biz({ id: '3', name_ar: 'محل ج', name_en: 'Shop C', rating_avg: '4', category_id: 'cat-1', city_id: 'city-1', is_verified: true }),
  ];

  it('returns all when no filters applied', () => {
    const result = filterAndSort(businesses, '', defaultFilters, [], [], 'ar');
    expect(result).toHaveLength(3);
  });

  it('filters by text query', () => {
    const result = filterAndSort(businesses, 'Factory', defaultFilters, [], [], 'en');
    expect(result).toHaveLength(2);
    expect(result.every(b => b.name_en?.includes('Factory'))).toBe(true);
  });

  it('filters by category', () => {
    const filters: SearchFilterValues = { ...defaultFilters, categoryId: 'cat-1' };
    const result = filterAndSort(businesses, '', filters, [], [], 'ar');
    expect(result).toHaveLength(2);
  });

  it('filters by city', () => {
    const filters: SearchFilterValues = { ...defaultFilters, cityId: 'city-2' };
    const result = filterAndSort(businesses, '', filters, [], [], 'ar');
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('2');
  });

  it('filters by minimum rating', () => {
    const filters: SearchFilterValues = { ...defaultFilters, minRating: 4 };
    const result = filterAndSort(businesses, '', filters, [], [], 'ar');
    expect(result).toHaveLength(2);
  });

  it('filters verified only', () => {
    const filters: SearchFilterValues = { ...defaultFilters, verifiedOnly: true };
    const result = filterAndSort(businesses, '', filters, [], [], 'ar');
    expect(result).toHaveLength(2);
    expect(result.every(b => b.is_verified)).toBe(true);
  });

  it('sorts by rating descending', () => {
    const result = filterAndSort(businesses, '', { ...defaultFilters, sortBy: 'rating' }, [], [], 'ar');
    expect(Number(result[0].rating_avg)).toBeGreaterThanOrEqual(Number(result[1].rating_avg));
  });

  it('sorts by name', () => {
    const result = filterAndSort(businesses, '', { ...defaultFilters, sortBy: 'name' }, [], [], 'en');
    expect(result[0].name_en).toBe('Factory A');
  });

  it('uses relevance sort when query is present', () => {
    const result = filterAndSort(businesses, 'Shop', { ...defaultFilters, sortBy: 'rating' }, [], [], 'en');
    expect(result[0].name_en).toBe('Shop C');
  });

  it('filters by price range', () => {
    const withServices = [
      biz({ id: '1', business_services: [{ price_from: 100, price_to: 500, is_active: true }] }),
      biz({ id: '2', business_services: [{ price_from: 1000, price_to: 2000, is_active: true }] }),
      biz({ id: '3', business_services: [] }),
    ];
    const filters: SearchFilterValues = { ...defaultFilters, priceMin: 200, priceMax: 600 };
    const result = filterAndSort(withServices, '', filters, [], [], 'ar');
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('1');
  });

  it('filters by tags', () => {
    const tags = [
      { entity_id: '1', tag_id: 'tag-a' },
      { entity_id: '2', tag_id: 'tag-b' },
    ];
    const result = filterAndSort(businesses, '', defaultFilters, ['tag-a'], tags, 'ar');
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('1');
  });

  it('combines multiple filters', () => {
    const filters: SearchFilterValues = { ...defaultFilters, categoryId: 'cat-1', minRating: 5, verifiedOnly: true };
    const result = filterAndSort(businesses, '', filters, [], [], 'ar');
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('1');
  });
});
