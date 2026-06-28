/**
 * TAXONOMY CENTRALIZATION PHASE 2C — CONTRACT TEMPLATES TAXONOMY METADATA
 *
 * Guards that every contract template carries a canonical `taxonomySlug`
 * from `CANONICAL_PRIMARY_SLUGS` and that legacy SEO fields are unchanged.
 */
import { describe, it, expect } from 'vitest';
import { CONTRACT_TEMPLATES } from '@/data/contractTemplates';
import {
  CANONICAL_PRIMARY_SLUGS,
  isCanonicalPrimarySlug,
  isLegacyPrimarySlug,
} from '@/modules/taxonomy/canonical-primaries';

describe('Phase 2C — contract templates taxonomy metadata', () => {
  it('still has exactly 6 templates with stable slugs', () => {
    const slugs = CONTRACT_TEMPLATES.map((t) => t.slug).sort();
    expect(slugs).toEqual(
      ['aluminum-glass', 'facades', 'kitchens', 'steel-metal', 'stainless-railings', 'wood-works'].sort(),
    );
  });

  it.each(CONTRACT_TEMPLATES.map((t) => [t.slug, t]))(
    'template %s has a canonical taxonomySlug (not legacy/forbidden)',
    (_slug, t) => {
      expect(t.taxonomySlug).toBeTruthy();
      expect(isCanonicalPrimarySlug(t.taxonomySlug)).toBe(true);
      expect(isLegacyPrimarySlug(t.taxonomySlug)).toBe(false);
      expect(CANONICAL_PRIMARY_SLUGS).toContain(t.taxonomySlug);
    },
  );

  it('preserves legacy quote_sector values verbatim', () => {
    const map = Object.fromEntries(CONTRACT_TEMPLATES.map((t) => [t.slug, t.quote_sector]));
    expect(map).toEqual({
      'aluminum-glass': 'aluminum',
      'steel-metal': 'steel',
      'wood-works': 'wood',
      'kitchens': 'wood',
      'facades': 'glass',
      'stainless-railings': 'stainless-steel',
    });
  });

  it('preserves legacy sector_route values verbatim', () => {
    const map = Object.fromEntries(CONTRACT_TEMPLATES.map((t) => [t.slug, t.sector_route]));
    expect(map).toEqual({
      'aluminum-glass': '/sectors/aluminum',
      'steel-metal': '/sectors/steel',
      'wood-works': '/sectors/wood',
      'kitchens': '/sectors/wood',
      'facades': '/sectors/glass',
      'stainless-railings': '/sectors/stainless-steel',
    });
  });
});