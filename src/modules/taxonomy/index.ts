export { default as TaxonomyAdminPage } from './components/TaxonomyAdminPage';
export * from './types';
export * as taxonomyServices from './services';
export * as taxonomyUtils from './utils';

// Phase 3 — business linking
export { default as BusinessTaxonomySection } from './components/BusinessTaxonomySection';
export * as taxonomyBusinessServices from './business-services';

// Phase 4 — resolution layer + legacy mapping
export * as taxonomyResolution from './resolution';
export * from './legacy-mapping';