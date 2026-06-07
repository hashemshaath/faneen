export { default as TaxonomyAdminPage } from './components/TaxonomyAdminPage';
export * from './types';
export * as taxonomyServices from './services';
export * as taxonomyUtils from './utils';

// Phase 3 — business linking
export { default as BusinessTaxonomySection } from './components/BusinessTaxonomySection';
export * as taxonomyBusinessServices from './business-services';

// Phase 8 — project linking
export * as taxonomyProjectServices from './project-services';

// Phase 11 — onboarding integration
export {
  default as OnboardingTaxonomyStep,
  EMPTY_ONBOARDING_TAXONOMY,
} from './components/OnboardingTaxonomyStep';
export type { OnboardingTaxonomyValue } from './components/OnboardingTaxonomyStep';

// Phase 12 — icon registry
export {
  getTaxonomyIcon, isKnownTaxonomyIcon,
  TAXONOMY_ICONS, TAXONOMY_ICON_KEYS,
} from './icon-map';
export type { TaxonomyIconKey } from './icon-map';

// Phase 4 — resolution layer + legacy mapping
export * as taxonomyResolution from './resolution';
export * from './legacy-mapping';

// Phase 8 — unification / migration registry
export * as taxonomyMigration from './migration-services';