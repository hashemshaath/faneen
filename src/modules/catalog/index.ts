// Provider Catalog module boundary.
//
// CAT-2: public + provider read wrappers. Writes remain direct at
// callsites until CAT-3..CAT-5. See ./README.md for the migration plan.

export {
  listServicesByBusiness,
  countServicesByBusiness,
} from './services/services/reads';
export { listBranchesByBusiness } from './services/branches/reads';
export {
  listAvailabilityByBusiness,
  listPublicAvailabilityByBusiness,
} from './services/availability/reads';
export { listServiceAreasByBusiness } from './services/serviceAreas/reads';
export {
  listGlobalBnplProviders,
  listBusinessBnplProviders,
} from './services/bnpl/reads';
export {
  listWarrantiesByContractIds,
  listWarrantiesForContract,
} from './services/warranties/reads';

// ── CAT-3 mutation wrappers (provider dashboard) ──
export {
  insertBusinessService,
  insertBusinessServices,
  insertBusinessServiceReturning,
  updateBusinessServiceById,
  deleteBusinessServiceById,
  deleteDemoBusinessServicesForBusiness,
} from './services/services/mutations';
export {
  insertServiceArea,
  deleteServiceAreaById,
  clearPrimaryServiceAreasForBusiness,
  setServiceAreaPrimaryById,
} from './services/serviceAreas/mutations';
export {
  deleteAvailabilityForBusiness,
  insertAvailabilityRows,
} from './services/availability/mutations';
export {
  insertWarranty,
  updateWarrantyById,
  deleteWarrantyById,
} from './services/warranties/mutations';

// ── CAT-4 admin wrappers ──
export { listAllBusinessServicesLite } from './services/services/admin';
export {
  insertBusinessBranch,
  updateBusinessBranchById,
  deleteBusinessBranchById,
} from './services/branches/mutations';
export {
  listAdminServiceAreasWithBusinesses,
  countAllServiceAreas,
} from './services/serviceAreas/admin';

// ── CAT-5 BNPL mutation wrappers ──
export {
  insertBnplProvider,
  updateBnplProviderById,
  deleteBnplProviderById,
  upsertBusinessBnplProvider,
  updateBusinessBnplProviderForBusiness,
} from './services/bnpl/mutations';