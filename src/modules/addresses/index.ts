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