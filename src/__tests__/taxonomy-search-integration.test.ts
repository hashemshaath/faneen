import { describe, it, expect } from 'vitest';
import {
  mergeTaxonomyAndLegacyBusinessIds,
  formatBusinessTaxonomyDisplayMap,
} from '@/modules/taxonomy/search-integration';
import {
  resolveLegacySectorToTaxonomy,
  LEGACY_SECTOR_TO_TAXONOMY_SLUG,
} from '@/modules/taxonomy/legacy-mapping';

describe('Phase 7 — taxonomy/search integration', () => {
  describe('legacy sector → taxonomy slug', () => {
    it.each([
      ['aluminum', 'aluminum-works'],
      ['glass', 'glass-securit-works'],
      ['steel', 'steel-metal-works'],
      ['wood', 'wood-carpentry'],
      ['stainless-steel', 'stainless-steel-works'],
      ['fabrication-installation', 'contracting-finishing'],
    ])('resolves "%s" → "%s"', (input, expected) => {
      expect(resolveLegacySectorToTaxonomy(input)).toBe(expected);
    });

    it('returns null for unknown sectors so the search falls back to legacy', () => {
      expect(resolveLegacySectorToTaxonomy('totally-unknown')).toBeNull();
      expect(resolveLegacySectorToTaxonomy(null)).toBeNull();
      expect(resolveLegacySectorToTaxonomy('')).toBeNull();
    });

    it('covers every legacy slug currently used by sector URLs', () => {
      // Locks in the contract: these URLs MUST keep resolving forever.
      const required = [
        'aluminum', 'steel', 'wood', 'glass',
        'stainless-steel', 'fabrication-installation',
      ];
      for (const k of required) {
        expect(LEGACY_SECTOR_TO_TAXONOMY_SLUG[k]).toBeTruthy();
      }
    });
  });

  describe('mergeTaxonomyAndLegacyBusinessIds', () => {
    it('dedupes across the two sources and preserves taxonomy-first order', () => {
      const out = mergeTaxonomyAndLegacyBusinessIds(['a', 'b'], ['b', 'c', 'a']);
      expect(out).toEqual(['a', 'b', 'c']);
    });
    it('handles empty inputs', () => {
      expect(mergeTaxonomyAndLegacyBusinessIds([], [])).toEqual([]);
      expect(mergeTaxonomyAndLegacyBusinessIds(['x'], [])).toEqual(['x']);
      expect(mergeTaxonomyAndLegacyBusinessIds([], ['y'])).toEqual(['y']);
    });
  });

  describe('formatBusinessTaxonomyDisplayMap (Phase 10)', () => {
    const rows = [
      {
        business_id: 'b1', category_id: 'c1', role: 'primary_activity', is_primary: true,
        taxonomy_categories: { id: 'c1', slug: 'aluminum-glass-facades', name_ar: 'ألمنيوم وزجاج وواجهات', name_en: 'Aluminum & Glass', type_id: null },
      },
      {
        business_id: 'b1', category_id: 'c2', role: 'secondary_activity', is_primary: false,
        taxonomy_categories: { id: 'c2', slug: 'steel-metal-works', name_ar: 'حديد ومعادن', name_en: 'Steel', type_id: null },
      },
      {
        business_id: 'b1', category_id: 'c3', role: 'service', is_primary: false,
        taxonomy_categories: { id: 'c3', slug: 'kitchens-fitout', name_ar: 'مطابخ وتجهيزات', name_en: 'Kitchens', type_id: null },
      },
      {
        business_id: 'b2', category_id: 'c1', role: 'secondary_activity', is_primary: false,
        taxonomy_categories: { id: 'c1', slug: 'aluminum-glass-facades', name_ar: 'ألمنيوم وزجاج وواجهات', name_en: 'Aluminum & Glass', type_id: null },
      },
    ];
    it('groups by business and splits primary/secondary/service in Arabic', () => {
      const map = formatBusinessTaxonomyDisplayMap(rows as any, 'ar');
      const b1 = map.get('b1')!;
      expect(b1.primaryLabel).toBe('ألمنيوم وزجاج وواجهات');
      expect(b1.primarySlug).toBe('aluminum-glass-facades');
      expect(b1.secondaryLabels).toEqual(['حديد ومعادن']);
      expect(b1.serviceLabels).toEqual(['مطابخ وتجهيزات']);
      expect(b1.hasModernTaxonomy).toBe(true);
      const b2 = map.get('b2')!;
      expect(b2.primaryLabel).toBeNull();
      expect(b2.secondaryLabels).toEqual(['ألمنيوم وزجاج وواجهات']);
    });
    it('falls back to English when language="en"', () => {
      const map = formatBusinessTaxonomyDisplayMap(rows as any, 'en');
      expect(map.get('b1')!.primaryLabel).toBe('Aluminum & Glass');
    });
    it('returns empty map for empty input', () => {
      expect(formatBusinessTaxonomyDisplayMap([], 'ar').size).toBe(0);
    });
  });
});