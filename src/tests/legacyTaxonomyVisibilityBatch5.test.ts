import { describe, it, expect } from 'vitest';
import {
  UI_FORBIDDEN_PRIMARY_SLUGS,
  CANONICAL_PRIMARY_SLUGS,
  isLegacyPrimarySlug,
  isCanonicalPrimarySlug,
} from '@/modules/taxonomy/canonical-primaries';
import { defaultTaxonomyFilters } from '@/modules/taxonomy/components/TaxonomyFilters';

describe('Safe Batch 5 — legacy taxonomy visibility', () => {
  it('flags every known legacy slug as legacy', () => {
    for (const slug of UI_FORBIDDEN_PRIMARY_SLUGS) {
      expect(isLegacyPrimarySlug(slug)).toBe(true);
      expect(isCanonicalPrimarySlug(slug)).toBe(false);
    }
  });

  it('canonical 13 primaries are not flagged as legacy', () => {
    for (const slug of CANONICAL_PRIMARY_SLUGS) {
      expect(isLegacyPrimarySlug(slug)).toBe(false);
      expect(isCanonicalPrimarySlug(slug)).toBe(true);
    }
  });

  it('admin filter defaults to hiding legacy categories', () => {
    expect(defaultTaxonomyFilters.showLegacy).toBe(false);
  });

  it('admin filter logic — when showLegacy is false, legacy rows are filtered out', () => {
    type Row = { slug: string };
    const rows: Row[] = [
      { slug: 'aluminum-works' },
      { slug: 'aluminum-glass-facades' },
      { slug: 'technology-systems' },
      { slug: 'glass-securit-works' },
      { slug: 'iron-steel' },
    ];
    const showLegacy = false;
    const visible = rows.filter((r) => showLegacy || !isLegacyPrimarySlug(r.slug));
    expect(visible.map((r) => r.slug)).toEqual(['aluminum-works', 'glass-securit-works']);
  });

  it('admin filter logic — when showLegacy is true, legacy rows are kept', () => {
    type Row = { slug: string };
    const rows: Row[] = [
      { slug: 'aluminum-works' },
      { slug: 'aluminum-glass-facades' },
    ];
    const showLegacy = true;
    const visible = rows.filter((r) => showLegacy || !isLegacyPrimarySlug(r.slug));
    expect(visible).toHaveLength(2);
  });

  it('public-loader defense — legacy rows are dropped from registration picker output', () => {
    // Simulates the post-fetch filter in getPublicTaxonomyCategoriesByType.
    type Row = { slug: string };
    const dbRows: Row[] = [
      { slug: 'aluminum-works' },
      { slug: 'aluminum' }, // legacy still in DB
      { slug: 'steel-metal-works' },
      { slug: 'iron-steel' }, // legacy still in DB
    ];
    const exposed = dbRows.filter((c) => !isLegacyPrimarySlug(c.slug));
    expect(exposed.map((r) => r.slug)).toEqual(['aluminum-works', 'steel-metal-works']);
  });
});