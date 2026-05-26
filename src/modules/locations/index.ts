// Module: locations
// Canonical reference-data wrappers for the public `cities` table.
export { listActiveCities } from './services/listActiveCities';
export type { ListActiveCitiesOptions } from './services/listActiveCities';
export { getCityById } from './services/getCityById';
export type { GetCityByIdOptions } from './services/getCityById';

// WRAPPER-ISOLATION-BACKLOG-1: edge function wrapper
export { nationalAddressLookup } from './services/nationalAddressLookup';
export type { NationalAddressLookupBody } from './services/nationalAddressLookup';