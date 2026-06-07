import { describe, it, expect } from 'vitest';
import { LEGACY_SECTOR_TO_TAXONOMY_SLUG } from '@/modules/taxonomy/legacy-mapping';

describe('legacy sector → taxonomy slug', () => {
  it.each([
    ['aluminum', 'aluminum-glass-facades'],
    ['steel', 'steel-metal-works'],
    ['wood', 'wood-carpentry'],
    ['stainless-steel', 'stainless-steel-fabrication'],
    ['fabrication-installation', 'contracting-finishing'],
  ])('%s maps to %s', (from, to) => {
    expect(LEGACY_SECTOR_TO_TAXONOMY_SLUG[from]).toBe(to);
  });

  it('all mapped target slugs are kebab-case (no underscores / spaces)', () => {
    for (const target of Object.values(LEGACY_SECTOR_TO_TAXONOMY_SLUG)) {
      expect(target).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
    }
  });
});