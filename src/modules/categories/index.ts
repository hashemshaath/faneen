// Module: categories
// Canonical reference-data wrappers for the legacy public `categories` table.
// `listActiveCategories` was removed in the legacy-taxonomy sunset (zero
// runtime callers). Only the single-row read used by ProjectDetail's legacy
// fallback is still exported.
export { getCategoryById } from './services/getCategoryById';
export type { GetCategoryByIdOptions } from './services/getCategoryById';
