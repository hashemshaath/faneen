/**
 * Safe Batch 4 — Business card + profile taxonomy display.
 *
 * Pure-function coverage for `formatBusinessTaxonomyDisplayMap`:
 *   - multi-primary grouping
 *   - secondary attached to its explicit parent primary
 *   - secondary-only business → parent inferred via parentLookup
 *   - legacy/forbidden primary slugs are canonicalized for display
 *   - empty input returns the fallback (handled at the consumer level
 *     via EMPTY_TAXONOMY_DISPLAY)
 */
import { describe, it, expect } from 'vitest';
import {
  formatBusinessTaxonomyDisplayMap,
  EMPTY_TAXONOMY_DISPLAY,
  type ParentCategoryRow,
} from '@/modules/taxonomy/search-integration';

const cat = (
  id: string,
  slug: string,
  name_ar: string,
  name_en: string,
  parent_id: string | null = null,
) => ({ id, slug, name_ar, name_en, taxonomy_type_id: null, parent_id });

describe('Safe Batch 4 — multi-primary business taxonomy display', () => {
  it('groups multiple primaries with their explicit child secondaries', () => {
    const rows = [
      {
        business_id: 'b1', category_id: 'p1', role: 'primary_activity', is_primary: true,
        taxonomy_categories: cat('p1', 'aluminum-works', 'أعمال الألمنيوم', 'Aluminum works'),
      },
      {
        business_id: 'b1', category_id: 'p2', role: 'primary_activity', is_primary: true,
        taxonomy_categories: cat('p2', 'glass-securit-works', 'أعمال الزجاج', 'Glass works'),
      },
      {
        business_id: 'b1', category_id: 's1', role: 'secondary_activity', is_primary: false,
        taxonomy_categories: cat('s1', 'aluminum-windows', 'نوافذ ألمنيوم', 'Aluminum windows', 'p1'),
      },
      {
        business_id: 'b1', category_id: 's2', role: 'secondary_activity', is_primary: false,
        taxonomy_categories: cat('s2', 'tempered-glass', 'زجاج مقوى', 'Tempered glass', 'p2'),
      },
    ];
    const map = formatBusinessTaxonomyDisplayMap(rows as any, 'ar');
    const d = map.get('b1')!;
    expect(d.primaries.map((p) => p.slug)).toEqual(['aluminum-works', 'glass-securit-works']);
    expect(d.groups).toHaveLength(2);
    expect(d.groups[0].primary?.slug).toBe('aluminum-works');
    expect(d.groups[0].secondaries.map((c) => c.label)).toEqual(['نوافذ ألمنيوم']);
    expect(d.groups[1].secondaries.map((c) => c.label)).toEqual(['زجاج مقوى']);
  });

  it('infers parent primary when the business only links a secondary', () => {
    const rows = [
      {
        business_id: 'b2', category_id: 's3', role: 'secondary_activity', is_primary: false,
        taxonomy_categories: cat('s3', 'kitchen-cabinets', 'خزائن مطابخ', 'Kitchen cabinets', 'pK'),
      },
    ];
    const parentLookup = new Map<string, ParentCategoryRow>([
      ['pK', { id: 'pK', slug: 'kitchens-works', name_ar: 'المطابخ', name_en: 'Kitchens' }],
    ]);
    const map = formatBusinessTaxonomyDisplayMap(rows as any, 'ar', parentLookup);
    const d = map.get('b2')!;
    expect(d.groups).toHaveLength(1);
    expect(d.groups[0].primary?.slug).toBe('kitchens-works');
    expect(d.groups[0].inferred).toBe(true);
    expect(d.groups[0].secondaries.map((c) => c.label)).toEqual(['خزائن مطابخ']);
    // Back-compat fields still populated.
    expect(d.primaryLabel).toBe('المطابخ');
  });

  it('canonicalizes forbidden legacy primary slugs for display', () => {
    const rows = [
      {
        business_id: 'b3', category_id: 'pL', role: 'primary_activity', is_primary: true,
        taxonomy_categories: cat('pL', 'aluminum-glass-facades', 'ألمنيوم وزجاج وواجهات', 'Aluminum & Glass'),
      },
    ];
    const map = formatBusinessTaxonomyDisplayMap(rows as any, 'ar');
    const d = map.get('b3')!;
    expect(d.primaries[0].slug).toBe('aluminum-works');
    expect(d.primaries[0].label).toBe('أعمال الألمنيوم');
    // Legacy display label must NOT leak through.
    expect(d.primaryLabel).not.toBe('ألمنيوم وزجاج وواجهات');
  });

  it('returns an empty display for businesses without any taxonomy rows', () => {
    const map = formatBusinessTaxonomyDisplayMap([], 'ar');
    expect(map.size).toBe(0);
    expect(EMPTY_TAXONOMY_DISPLAY.hasModernTaxonomy).toBe(false);
    expect(EMPTY_TAXONOMY_DISPLAY.primaries).toEqual([]);
    expect(EMPTY_TAXONOMY_DISPLAY.groups).toEqual([]);
  });
});