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

const businesses = [
  {
    id: 'b1', name_ar: 'A', name_en: 'A', rating_avg: 5, created_at: '2025-01-01',
    category_id: 'cat-alu', is_verified: true,
    business_services: [{ is_active: true, category_id: 'cat-alu-win' }],
  },
  {
    id: 'b2', name_ar: 'B', name_en: 'B', rating_avg: 4, created_at: '2025-01-01',
    category_id: 'cat-alu-door', is_verified: false,
    business_services: [{ is_active: true, category_id: 'cat-alu-door' }],
  },
  {
    id: 'b3', name_ar: 'C', name_en: 'C', rating_avg: 3, created_at: '2025-01-01',
    category_id: 'cat-glass', is_verified: false,
    business_services: [{ is_active: true, category_id: 'cat-mirrors' }],
  },
  {
    id: 'b4', name_ar: 'D', name_en: 'D', rating_avg: 2, created_at: '2025-01-01',
    category_id: 'cat-glass', is_verified: false,
    business_services: [{ is_active: true, category_id: null }],
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

describe('filterAndSort — category & service facet', () => {
  it('parent category includes providers from child categories', () => {
    const res = filterAndSort(
      businesses, '', { ...defaultFilters, categoryId: 'cat-alu' }, [], [], 'ar', categories,
    );
    expect(res.map((b) => b.id).sort()).toEqual(['b1', 'b2']);
  });

  it('parent category accepts slug input', () => {
    const res = filterAndSort(
      businesses, '', { ...defaultFilters, categoryId: 'aluminum' }, [], [], 'ar', categories,
    );
    expect(res.map((b) => b.id).sort()).toEqual(['b1', 'b2']);
  });

  it('child category does not return sibling categories', () => {
    const res = filterAndSort(
      businesses, '', { ...defaultFilters, categoryId: 'cat-alu-win' }, [], [], 'ar', categories,
    );
    expect(res.map((b) => b.id)).toEqual(['b1']);
  });

  it('serviceCategoryId returns providers with matching active service', () => {
    const res = filterAndSort(
      businesses, '', { ...defaultFilters, serviceCategoryId: 'cat-mirrors' }, [], [], 'ar', categories,
    );
    expect(res.map((b) => b.id)).toEqual(['b3']);
  });

  it('serviceCategoryId parent rolls up to child services', () => {
    const res = filterAndSort(
      businesses, '', { ...defaultFilters, serviceCategoryId: 'aluminum' }, [], [], 'ar', categories,
    );
    expect(res.map((b) => b.id).sort()).toEqual(['b1', 'b2']);
  });

  it('serviceCategoryId ignores services with NULL category_id', () => {
    const res = filterAndSort(
      businesses, '', { ...defaultFilters, serviceCategoryId: 'cat-glass' }, [], [], 'ar', categories,
    );
    // b4 has NULL service category and must be excluded; b3 matches via mirrors child.
    expect(res.map((b) => b.id)).toEqual(['b3']);
  });

  it('legacy categoryId works without categories tree (slug fallback via embedded categories)', () => {
    const withEmbedded = [{ ...businesses[0], categories: { slug: 'aluminum' } }];
    const res = filterAndSort(
      withEmbedded, '', { ...defaultFilters, categoryId: 'aluminum' }, [], [], 'ar', undefined,
    );
    expect(res.map((b) => b.id)).toEqual(['b1']);
  });
});