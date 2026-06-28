import { describe, it, expect } from 'vitest';
import { resolveQuoteSectorTaxonomy } from '@/modules/taxonomy/resolveQuoteSectorTaxonomy';
import { CANONICAL_PRIMARY_SLUGS } from '@/modules/taxonomy/canonical-primaries';

describe('Phase 3B — resolveQuoteSectorTaxonomy (pure)', () => {
  it('canonical sector resolves to itself', () => {
    for (const slug of CANONICAL_PRIMARY_SLUGS) {
      expect(resolveQuoteSectorTaxonomy({ sector: slug })).toBe(slug);
    }
  });

  it.each([
    ['aluminum', 'aluminum-works'],
    ['iron', 'steel-metal-works'],
    ['wood', 'wood-carpentry'],
    ['glass', 'glass-securit-works'],
    ['stainless', 'stainless-steel-works'],
    ['fabrication', 'contracting-finishing'],
    ['storefronts', 'facades-cladding'],
    ['project-fitout', 'contracting-finishing'],
  ])('legacy sector %s → %s', (legacy, canonical) => {
    expect(resolveQuoteSectorTaxonomy({ sector: legacy })).toBe(canonical);
  });

  it('returns null for `other`', () => {
    expect(resolveQuoteSectorTaxonomy({ sector: 'other' })).toBeNull();
  });

  it('returns null for unknown / empty / null', () => {
    expect(resolveQuoteSectorTaxonomy({ sector: 'totally-unknown' })).toBeNull();
    expect(resolveQuoteSectorTaxonomy({ sector: '' })).toBeNull();
    expect(resolveQuoteSectorTaxonomy({ sector: null })).toBeNull();
    expect(resolveQuoteSectorTaxonomy({})).toBeNull();
  });

  it('prefers metadata.taxonomy_primary_slug when valid', () => {
    expect(
      resolveQuoteSectorTaxonomy({
        sector: 'aluminum',
        taxonomyPrimarySlug: 'kitchens-works',
      }),
    ).toBe('kitchens-works');
  });

  it('ignores `other` in primary slug and falls back to sector', () => {
    expect(
      resolveQuoteSectorTaxonomy({ sector: 'aluminum', taxonomyPrimarySlug: 'other' }),
    ).toBe('aluminum-works');
  });

  it('falls back to sector when primary slug is unknown', () => {
    expect(
      resolveQuoteSectorTaxonomy({ sector: 'wood', taxonomyPrimarySlug: 'nonsense' }),
    ).toBe('wood-carpentry');
  });
});