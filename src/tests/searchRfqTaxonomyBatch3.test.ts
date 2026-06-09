import { describe, it, expect } from 'vitest';
import {
  CANONICAL_PRIMARY_SLUGS,
  CANONICAL_PRIMARY_LABELS,
  isCanonicalPrimarySlug,
  UI_FORBIDDEN_PRIMARY_SLUGS,
} from '@/modules/taxonomy/canonical-primaries';
import { resolveQuoteSectorFromUrl } from '@/lib/sectors-seo';
import {
  LEGACY_SECTOR_TO_TAXONOMY_SLUG,
  resolveLegacySectorToTaxonomy,
} from '@/modules/taxonomy/legacy-mapping';

describe('Safe Batch 3 — canonical primary taxonomy', () => {
  it('exposes exactly the 13 primaries', () => {
    expect(CANONICAL_PRIMARY_SLUGS).toHaveLength(13);
  });

  it('every canonical slug has Arabic + English labels', () => {
    for (const slug of CANONICAL_PRIMARY_SLUGS) {
      expect(CANONICAL_PRIMARY_LABELS[slug].ar.length).toBeGreaterThan(2);
      expect(CANONICAL_PRIMARY_LABELS[slug].en.length).toBeGreaterThan(2);
    }
  });

  it('isCanonicalPrimarySlug accepts new slugs and rejects legacy / hidden slugs', () => {
    expect(isCanonicalPrimarySlug('aluminum-works')).toBe(true);
    expect(isCanonicalPrimarySlug('glass-securit-works')).toBe(true);
    expect(isCanonicalPrimarySlug('aluminum-glass-facades')).toBe(false);
    expect(isCanonicalPrimarySlug('technology-systems')).toBe(false);
    expect(isCanonicalPrimarySlug('heavy-equipment-rental')).toBe(false);
    expect(isCanonicalPrimarySlug('stainless-steel-fabrication')).toBe(false);
    expect(isCanonicalPrimarySlug('')).toBe(false);
    expect(isCanonicalPrimarySlug(null)).toBe(false);
  });

  it('UI_FORBIDDEN_PRIMARY_SLUGS never includes a canonical slug', () => {
    for (const slug of UI_FORBIDDEN_PRIMARY_SLUGS) {
      expect(CANONICAL_PRIMARY_SLUGS).not.toContain(slug as never);
    }
  });
});

describe('Safe Batch 3 — legacy URL → canonical resolution', () => {
  it.each([
    ['aluminum', 'aluminum-works'],
    ['glass', 'glass-securit-works'],
    ['iron', 'steel-metal-works'],
    ['stainless', 'stainless-steel-works'],
    ['fabrication', 'contracting-finishing'],
    ['aluminum-glass-facades', 'aluminum-works'],
    ['technology-systems', 'technology-networks'],
    ['heavy-equipment-rental', 'equipment-rental'],
    ['stainless-steel-fabrication', 'stainless-steel-works'],
  ])('?sector=%s resolves to canonical %s', (input, expected) => {
    expect(resolveQuoteSectorFromUrl(input)).toBe(expected);
  });

  it('canonical slugs round-trip through resolveQuoteSectorFromUrl', () => {
    for (const slug of CANONICAL_PRIMARY_SLUGS) {
      expect(resolveQuoteSectorFromUrl(slug)).toBe(slug);
    }
  });

  it('every legacy mapping target is itself a canonical primary (so it never lands the UI on a forbidden slug)', () => {
    const canonicalSet = new Set<string>(CANONICAL_PRIMARY_SLUGS);
    // Allow one explicit exception: building-materials-supply is intentionally
    // out of the canonical 13 (kept on a legacy target until P5).
    const exceptions = new Set(['building-materials-supply']);
    for (const [from, to] of Object.entries(LEGACY_SECTOR_TO_TAXONOMY_SLUG)) {
      if (exceptions.has(to)) continue;
      expect(canonicalSet.has(to), `${from} → ${to} not canonical`).toBe(true);
    }
  });

  it('forbidden UI slugs do not silently resolve to themselves via legacy mapping', () => {
    for (const slug of UI_FORBIDDEN_PRIMARY_SLUGS) {
      const mapped = resolveLegacySectorToTaxonomy(slug);
      // Either unmapped (null) OR mapped to a *different* canonical slug.
      if (mapped !== null) {
        expect(mapped).not.toBe(slug);
        expect(CANONICAL_PRIMARY_SLUGS).toContain(mapped as never);
      }
    }
  });
});