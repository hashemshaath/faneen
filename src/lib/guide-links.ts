/**
 * Maps each buyer-guide slug → the most relevant service in the catalog,
 * used to deep-link guide cards to /services/:slug for in-depth pricing.
 *
 * Keep this file colocated with `sector-guides.ts` so adding a new guide
 * surfaces an obvious place to add the matching service link.
 */
import type { SectorSlug } from './sector-keywords';

export const GUIDE_TO_SERVICE: Record<string, string> = {
  // Aluminum
  'choose-aluminum-windows': 'aluminum-windows',
  'aluminum-cladding-spec': 'aluminum-cladding',
  'pergolas-sizing': 'aluminum-pergolas',
  // Iron
  'iron-canopy-sizing': 'steel-canopies',
  'choose-laser-gate': 'iron-gates',
  'iron-rust-protection': 'steel-canopies',
  // Glass
  'storefront-glass-spec': 'glass-shopfronts',
  'shower-cabin-spec': 'glass-shower-cabins',
  'tempered-vs-laminated': 'glass-shopfronts',
  // Wood
  'choose-interior-doors': 'wood-doors',
  'parquet-vs-spc': 'wood-flooring',
  'mdf-vs-hdf': 'wood-doors',
  // Cabinets
  'kitchen-material-guide': 'kitchen-cabinets',
  'wardrobe-sliding-vs-hinged': 'wardrobes',
  'kitchen-counter-tops': 'kitchen-cabinets',
};

export function getServiceForGuide(guideSlug: string): string | null {
  return GUIDE_TO_SERVICE[guideSlug] ?? null;
}

/** Per-sector default service used as a fallback when no guide-specific link exists. */
export const SECTOR_DEFAULT_SERVICE: Record<SectorSlug, string> = {
  aluminum: 'aluminum-windows',
  iron: 'steel-canopies',
  glass: 'glass-shopfronts',
  wood: 'wood-doors',
  cabinets: 'kitchen-cabinets',
};
