import { describe, it, expect } from 'vitest';
import {
  getTaxonomyIcon,
  isKnownTaxonomyIcon,
  TAXONOMY_ICONS,
  TAXONOMY_ICON_KEYS,
} from '@/modules/taxonomy/icon-map';

describe('taxonomy icon map (Phase 12)', () => {
  it('falls back to Tags for null/empty/unknown icon names', () => {
    expect(getTaxonomyIcon(null)).toBe(TAXONOMY_ICONS.Tags);
    expect(getTaxonomyIcon(undefined)).toBe(TAXONOMY_ICONS.Tags);
    expect(getTaxonomyIcon('')).toBe(TAXONOMY_ICONS.Tags);
    expect(getTaxonomyIcon('   ')).toBe(TAXONOMY_ICONS.Tags);
    expect(getTaxonomyIcon('NotARealIconXYZ')).toBe(TAXONOMY_ICONS.Tags);
  });

  it('returns the registered icon component for known keys', () => {
    expect(getTaxonomyIcon('Building2')).toBe(TAXONOMY_ICONS.Building2);
    expect(getTaxonomyIcon('Factory')).toBe(TAXONOMY_ICONS.Factory);
    expect(getTaxonomyIcon('HardHat')).toBe(TAXONOMY_ICONS.HardHat);
  });

  it('isKnownTaxonomyIcon correctly classifies icons', () => {
    expect(isKnownTaxonomyIcon('Building2')).toBe(true);
    expect(isKnownTaxonomyIcon('User')).toBe(true);
    expect(isKnownTaxonomyIcon(null)).toBe(false);
    expect(isKnownTaxonomyIcon('')).toBe(false);
    expect(isKnownTaxonomyIcon('NotARealIcon')).toBe(false);
  });

  it('registry covers all entity types and primary activities required by the project memory', () => {
    const required = [
      // Entity types
      'User', 'Building2', 'Factory', 'Wrench', 'Store', 'Truck', 'HardHat',
      'DraftingCompass', 'Settings', 'Landmark', 'ShieldCheck', 'Handshake',
      'Briefcase', 'CircleEllipsis',
      // Primary activities
      'Paintbrush', 'PanelsTopLeft', 'Hammer', 'Trees', 'Package', 'Cpu',
      // Services
      'Utensils', 'Layers',
    ];
    required.forEach((key) => {
      expect(TAXONOMY_ICON_KEYS).toContain(key);
    });
  });
});