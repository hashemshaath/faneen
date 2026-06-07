import { describe, it, expect } from 'vitest';
import { mergeTaxonomyAndLegacyBusinessIds } from '@/modules/taxonomy/search-integration';
import {
  resolveLegacySectorToTaxonomy,
  LEGACY_SECTOR_TO_TAXONOMY_SLUG,
} from '@/modules/taxonomy/legacy-mapping';

describe('Phase 7 — taxonomy/search integration', () => {
  describe('legacy sector → taxonomy slug', () => {
    it.each([
      ['aluminum', 'aluminum-glass-facades'],
      ['steel', 'steel-metal-works'],
      ['wood', 'wood-carpentry'],
      ['stainless-steel', 'stainless-steel-fabrication'],
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
});