import { describe, it, expect } from 'vitest';
import { LEGACY_SECTOR_TO_TAXONOMY_SLUG } from '@/modules/taxonomy/legacy-mapping';

describe('legacy sector → taxonomy slug', () => {
  it.each([
    ['aluminum', 'aluminum-works'],
    ['glass', 'glass-securit-works'],
    ['steel', 'steel-metal-works'],
    ['wood', 'wood-carpentry'],
    ['stainless-steel', 'stainless-steel-works'],
    ['fabrication-installation', 'contracting-finishing'],
    ['technology-systems', 'technology-networks'],
    ['heavy-equipment-rental', 'equipment-rental'],
    ['aluminum-glass-facades', 'aluminum-works'],
    ['stainless-steel-fabrication', 'stainless-steel-works'],
  ])('%s maps to %s', (from, to) => {
    expect(LEGACY_SECTOR_TO_TAXONOMY_SLUG[from]).toBe(to);
  });

  it('all mapped target slugs are kebab-case (no underscores / spaces)', () => {
    for (const target of Object.values(LEGACY_SECTOR_TO_TAXONOMY_SLUG)) {
      expect(target).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
    }
  });
});