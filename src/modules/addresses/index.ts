/**
 * Central addresses microservice.
 * One source of truth for address data across profiles, businesses, and branches.
 * All callers MUST go through this module — the isolation audit enforces it.
 */
export type { AddressOwnerType, AddressSource, AddressRow, AddressInsert, AddressUpdate, OwnerRef, AddressFields } from './types';
export { listAddresses } from './services/listAddresses';
export { getPrimaryAddress } from './services/getPrimaryAddress';
export { upsertAddress } from './services/upsertAddress';
export { setPrimaryAddress } from './services/setPrimaryAddress';
export { deleteAddress } from './services/deleteAddress';
export { resolveFromSpl, pingSpl, type SplLookupResult } from './services/resolveFromSpl';

// ADDRESS-GOVERNANCE-1 — central governance API
export { upsertPrimaryAddress } from './services/upsertPrimaryAddress';
export type { UpsertPrimaryAddressOptions } from './services/upsertPrimaryAddress';
export {
  listRegions, listDistrictsByCity, searchDistricts,
  type RegionOption, type DistrictRow,
} from './services/districts';
export { buildAddressLine, normalizeAddressPayload } from './helpers/buildAddressLine';
export type { AddressType } from './types';

/** Alias for governance — `listAddresses` already implements this API. */
export { listAddresses as listAddressesForOwner } from './services/listAddresses';