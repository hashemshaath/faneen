/** ASSET-MANAGEMENT-MICROSERVICE-1 — public barrel. */
export * from './types';
export * from './constants';
export * as AssetCategoriesApi from './services/categories';
export * as AssetsApi from './services/assets';
export * as AssetMaintenanceApi from './services/maintenance';
export * as AssetInspectionsApi from './services/inspections';
export * as AssetUtilizationApi from './services/utilization';
export * as AssetRentalLinksApi from './services/rentalLinks';
export * as AssetOps from './services/operationsHub';
export { computeUtilization, isLowUtilization } from './utils/utilization';
export { canTransition, daysUntil, maintenanceTier } from './utils/lifecycle';
export type { MaintenanceAlertTier } from './utils/lifecycle';
export { AssetStatusBadge } from './components/AssetStatusBadge';
export { AssetOpsCard } from './components/AssetOpsCard';