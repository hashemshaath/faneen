import { describe, it, expect } from 'vitest';
import {
  filterAndSort,
  defaultFilters,
  resolveCategory,
  expandCategoryIds,
  type CategoryLite,
} from '../useSearch';

const categories: CategoryLite[] = [
  { id: 'cat-alu', slug: 'aluminum', parent_id: null },
  { id: 'cat-glass', slug: 'glass', parent_id: null },
  { id: 'cat-alu-win', slug: 'aluminum-windows', parent_id: 'cat-alu' },
  { id: 'cat-alu-door', slug: 'aluminum-doors', parent_id: 'cat-alu' },
  { id: 'cat-mirrors', slug: 'mirrors', parent_id: 'cat-glass' },
];

// Phase 18a — fixtures no longer set `category_id` on the business or on
// nested business_services rows. Category / service-category resolution is
// performed upstream (taxonomyBusinessIds / serviceCategoryBusinessIds) and
// passed into filterAndSort as Sets.
const businesses = [
  {
    id: 'b1', name_ar: 'A', name_en: 'A', rating_avg: 5, created_at: '2025-01-01',
    is_verified: true,
    business_services: [{ id: 's1', is_active: true }],
  },
  {
    id: 'b2', name_ar: 'B', name_en: 'B', rating_avg: 4, created_at: '2025-01-01',
    is_verified: false,
    business_services: [{ id: 's2', is_active: true }],
  },
  {
    id: 'b3', name_ar: 'C', name_en: 'C', rating_avg: 3, created_at: '2025-01-01',
    is_verified: false,
    business_services: [{ id: 's3', is_active: true }],
  },
  {
    id: 'b4', name_ar: 'D', name_en: 'D', rating_avg: 2, created_at: '2025-01-01',
    is_verified: false,
    business_services: [{ id: 's4', is_active: true }],
  },
];

describe('resolveCategory', () => {
  it('returns null for "all" or unknown values', () => {
    expect(resolveCategory('all', categories)).toBeNull();
    expect(resolveCategory('nope', categories)).toBeNull();
    expect(resolveCategory('', categories)).toBeNull();
  });
  it('resolves by UUID', () => {
    expect(resolveCategory('cat-alu', categories)?.slug).toBe('aluminum');
  });
  it('resolves by slug', () => {
    expect(resolveCategory('aluminum-windows', categories)?.id).toBe('cat-alu-win');
  });
});

describe('expandCategoryIds', () => {
  it('parent expands to itself + direct children', () => {
    const ids = expandCategoryIds(categories[0], categories);
    expect([...ids].sort()).toEqual(['cat-alu', 'cat-alu-door', 'cat-alu-win']);
  });
  it('child expands to itself only', () => {
    const ids = expandCategoryIds(categories[2], categories);
    expect([...ids]).toEqual(['cat-alu-win']);
  });
});

describe('filterAndSort — taxonomy-first category & service facet (Phase 18a)', () => {
  it('category filter uses taxonomyBusinessIds as the sole source', () => {
    const res = filterAndSort(
      businesses, '', { ...defaultFilters, categoryId: 'cat-alu' }, [], [], 'ar', categories,
      new Set<string>(['b1', 'b2']),
    );
    expect(res.map((b) => b.id).sort()).toEqual(['b1', 'b2']);
  });

  it('category filter narrows to zero when no taxonomy ids resolve', () => {
    const res = filterAndSort(
      businesses, '', { ...defaultFilters, categoryId: 'aluminum' }, [], [], 'ar', categories,
      // No taxonomyBusinessIds → legacy column is NOT consulted, so empty.
      undefined,
    );
    expect(res).toEqual([]);
  });

  it('category filter does NOT consult legacy businesses.category_id', () => {
    // Even fixtures with a stale `category_id` matching the filter value
    // must be excluded unless they appear in taxonomyBusinessIds.
    const stale = [{ ...businesses[0], category_id: 'cat-alu' }];
    const res = filterAndSort(
      stale, '', { ...defaultFilters, categoryId: 'cat-alu' }, [], [], 'ar', categories,
      new Set<string>(),
    );
    expect(res).toEqual([]);
  });

  it('serviceCategoryId uses serviceCategoryBusinessIds as the sole source', () => {
    const res = filterAndSort(
      businesses, '', { ...defaultFilters, serviceCategoryId: 'cat-mirrors' },
      [], [], 'ar', categories,
      undefined,
      new Set<string>(['b3']),
    );
    expect(res.map((b) => b.id)).toEqual(['b3']);
  });

  it('serviceCategoryId does NOT read business_services.category_id', () => {
    // Fixtures with stale nested `category_id` on services must NOT leak
    // through when serviceCategoryBusinessIds is empty.
    const stale = [{
      ...businesses[0],
      business_services: [{ id: 's1', is_active: true, category_id: 'cat-mirrors' }],
    }];
    const res = filterAndSort(
      stale, '', { ...defaultFilters, serviceCategoryId: 'cat-mirrors' },
      [], [], 'ar', categories,
      undefined,
      new Set<string>(),
    );
    expect(res).toEqual([]);
  });
});