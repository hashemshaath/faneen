// Module: businesses
// Canonical wrappers for public business reads.
export { listBusinessesByIds } from './services/listBusinessesByIds';
export type { ListBusinessesByIdsOptions } from './services/listBusinessesByIds';
export { countActiveBusinesses } from './services/countActiveBusinesses';
export { countBusinesses } from './services/countBusinesses';
export type { CountBusinessesOptions, CountBusinessesFilter } from './services/countBusinesses';
export { listAdminBusinesses } from './services/listAdminBusinesses';
export type {
  ListAdminBusinessesOptions,
  ListAdminBusinessesFilter,
  ListAdminBusinessesOrder,
} from './services/listAdminBusinesses';
export { getAdminBusinessById } from './services/getAdminBusinessById';
export type { GetAdminBusinessByIdOptions } from './services/getAdminBusinessById';
export { getPublicBusinessByUsername } from './services/getPublicBusinessByUsername';
export type { GetPublicBusinessByUsernameOptions } from './services/getPublicBusinessByUsername';
export { listPublicBusinessesForSector } from './services/listPublicBusinessesForSector';
export type {
  ListPublicBusinessesForSectorOptions,
  ListPublicBusinessesForSectorFilter,
  ListPublicBusinessesForSectorOrder,
} from './services/listPublicBusinessesForSector';
export { getBusinessByRefId } from './services/getBusinessByRefId';
export type { GetBusinessByRefIdOptions } from './services/getBusinessByRefId';
export { listCompareBusinesses } from './services/listCompareBusinesses';
export type { ListCompareBusinessesOptions } from './services/listCompareBusinesses';
export { getBusinessForContract } from './services/getBusinessForContract';
export type { GetBusinessForContractOptions } from './services/getBusinessForContract';
export { getOwnerBusiness, getOwnerBusinessId } from './services/getOwnerBusiness';
export type { GetOwnerBusinessOptions } from './services/getOwnerBusiness';
export { listOwnerBusinesses } from './services/listOwnerBusinesses';
export type { ListOwnerBusinessesOptions } from './services/listOwnerBusinesses';
export { listManagedBusinessesForUser } from './services/listManagedBusinessesForUser';
export type { ManagedBusiness } from './services/listManagedBusinessesForUser';
export { listBusinessesForRequests } from './services/listBusinessesForRequests';
export type { RequestsBusiness } from './services/listBusinessesForRequests';
export { getBusinessProviderContactForEmail } from './services/getBusinessProviderContactForEmail';
export type {
  GetBusinessProviderContactForEmailOptions,
  BusinessProviderContactForEmail,
} from './services/getBusinessProviderContactForEmail';
export { getActiveBusinessStaffMembership } from './services/getActiveBusinessStaffMembership';
export type { GetActiveBusinessStaffMembershipOptions } from './services/getActiveBusinessStaffMembership';
export { listActiveStaffBusinessesForUser } from './services/listActiveStaffBusinessesForUser';
export type { ListActiveStaffBusinessesForUserOptions } from './services/listActiveStaffBusinessesForUser';
export { listManagedStaffMembershipForUser } from './services/listManagedStaffMembershipForUser';
export type { ListManagedStaffMembershipForUserOptions } from './services/listManagedStaffMembershipForUser';
export { listAllBusinessStaffForAdmin } from './services/listAllBusinessStaffForAdmin';
export type { ListAllBusinessStaffForAdminOptions } from './services/listAllBusinessStaffForAdmin';
export { insertBusinessStaff } from './services/insertBusinessStaff';
export type { InsertBusinessStaffOptions } from './services/insertBusinessStaff';
export { updateBusinessStaffById } from './services/updateBusinessStaffById';
export type { UpdateBusinessStaffByIdOptions } from './services/updateBusinessStaffById';
export { deleteBusinessStaffById } from './services/deleteBusinessStaffById';
export type { DeleteBusinessStaffByIdOptions } from './services/deleteBusinessStaffById';
export { updateBusinessById } from './services/updateBusinessById';
export type { UpdateBusinessByIdOptions } from './services/updateBusinessById';
export { updateBusinessesByIds } from './services/updateBusinessesByIds';
export type { UpdateBusinessesByIdsOptions } from './services/updateBusinessesByIds';
export { insertBusiness } from './services/insertBusiness';
export type { InsertBusinessOptions } from './services/insertBusiness';

// R4E-3 — Guarded sensitive mutation wrappers
export {
  setBusinessActive,
  setBusinessVerified,
  bulkSetBusinessesActive,
  bulkSetBusinessesVerified,
} from './services/guardedMutations';
export {
  updateBusinessStaffRole,
  setBusinessStaffActive,
  removeBusinessStaff,
} from './services/guardedStaffMutations';

// R4B — Public read wrappers (businesses_public view)
export { listTopPublicProviders } from './services/public/listTopPublicProviders';
export type { ListTopPublicProvidersOptions } from './services/public/listTopPublicProviders';
export { listPublicBusinessesByCategory } from './services/public/listPublicBusinessesByCategory';
export type { ListPublicBusinessesByCategoryOptions } from './services/public/listPublicBusinessesByCategory';
export { getPublicBusinessForVerify } from './services/public/getPublicBusinessForVerify';
export { listPublicProvidersForAnalytics } from './services/public/listPublicProvidersForAnalytics';

// R4A — Domain types
export type {
  BusinessRow,
  BusinessInsert,
  BusinessUpdate,
  BusinessStaffRow,
  BusinessStaffInsert,
  BusinessStaffUpdate,
} from './types';

// REGISTRATION-UX-FULL-COMPLETE-1 Part 2
export { insertBusinessBranch } from './services/insertBusinessBranch';
export type { InsertBusinessBranchOptions } from './services/insertBusinessBranch';

// WRAPPER-ISOLATION-BACKLOG-1
export { getBusinessIdByUsername } from './services/getBusinessIdByUsername';
export type { GetBusinessIdByUsernameOptions } from './services/getBusinessIdByUsername';
export { getBusinessIdByRefOrLegacyRef } from './services/getBusinessIdByRefOrLegacyRef';
export type { GetBusinessIdByRefOrLegacyRefOptions } from './services/getBusinessIdByRefOrLegacyRef';
export { findBusinessDuplicateCandidates } from './services/findBusinessDuplicateCandidates';
export type {
  FindBusinessDuplicateCandidatesOptions,
  FindBusinessDuplicateCandidatesKind,
} from './services/findBusinessDuplicateCandidates';

// BUSINESS-ADMIN-4: admin-safe enrichment wrapper for ENT/BIZ refs
export { getAdminBusinessSummaryByRef } from './services/getAdminBusinessSummaryByRef';
export type { AdminBusinessSummary } from './services/getAdminBusinessSummaryByRef';
