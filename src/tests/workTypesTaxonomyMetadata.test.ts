/**
 * TAXONOMY CENTRALIZATION PHASE 2D — WORK TYPES TAXONOMY METADATA
 */
import { describe, it, expect } from 'vitest';
import { WORK_TYPES, type WorkTypeKey } from '@/lib/contract-work-types';
import {
  CANONICAL_PRIMARY_SLUGS,
  isCanonicalPrimarySlug,
  isLegacyPrimarySlug,
} from '@/modules/taxonomy/canonical-primaries';

describe('Phase 2D — work types taxonomy metadata', () => {
  it('still has exactly 11 work types with stable keys/order', () => {
    const keys: WorkTypeKey[] = WORK_TYPES.map((w) => w.key);
    expect(keys).toEqual([
      'kitchens',
      'aluminum_doors_windows',
      'glass_securit',
      'facades',
      'upvc',
      'wood_doors',
      'iron_doors_windows',
      'fire_doors',
      'gates_structures',
      'wardrobes_closets',
      'general',
    ]);
  });

  it.each(WORK_TYPES.map((w) => [w.key, w]))(
    'work type %s has a canonical taxonomySlug (not legacy/forbidden)',
    (_key, w) => {
      expect(w.taxonomySlug).toBeTruthy();
      expect(isCanonicalPrimarySlug(w.taxonomySlug)).toBe(true);
      expect(isLegacyPrimarySlug(w.taxonomySlug)).toBe(false);
      expect(CANONICAL_PRIMARY_SLUGS).toContain(w.taxonomySlug);
    },
  );

  it('preserves legacy templateCategory values verbatim', () => {
    const map = Object.fromEntries(WORK_TYPES.map((w) => [w.key, w.templateCategory]));
    expect(map).toEqual({
      kitchens: 'kitchens',
      aluminum_doors_windows: 'aluminum_doors_windows',
      glass_securit: 'glass_securit',
      facades: 'facades',
      upvc: 'upvc',
      wood_doors: 'wood_doors',
      iron_doors_windows: 'iron_doors_windows',
      fire_doors: 'fire_doors',
      gates_structures: 'gates_structures',
      wardrobes_closets: 'wardrobes_closets',
      general: 'general',
    });
  });

  it('maps each work type to the expected canonical primary', () => {
    const map = Object.fromEntries(WORK_TYPES.map((w) => [w.key, w.taxonomySlug]));
    expect(map).toEqual({
      kitchens: 'kitchens-works',
      aluminum_doors_windows: 'aluminum-works',
      glass_securit: 'glass-securit-works',
      facades: 'facades-cladding',
      upvc: 'aluminum-works',
      wood_doors: 'wood-carpentry',
      iron_doors_windows: 'steel-metal-works',
      fire_doors: 'steel-metal-works',
      gates_structures: 'steel-metal-works',
      wardrobes_closets: 'wood-carpentry',
      general: 'contracting-finishing',
    });
  });
});