// Module: locations
// Canonical reference-data wrappers for the public `cities` table.
export { listActiveCities } from './services/listActiveCities';
export type { ListActiveCitiesOptions } from './services/listActiveCities';
export { getCityById } from './services/getCityById';
export type { GetCityByIdOptions } from './services/getCityById';

// WRAPPER-ISOLATION-BACKLOG-1: edge function wrapper
export { nationalAddressLookup } from './services/nationalAddressLookup';
export type { NationalAddressLookupBody } from './services/nationalAddressLookup';

// WORKSPACE-CONTEXT-2 — workspace location wrappers (business_branches)
export { listLocationsForEntity } from './services/workspace/listLocationsForEntity';
export type {
  ListLocationsForEntityOptions,
  WorkspaceLocationRow,
} from './services/workspace/listLocationsForEntity';
export { getLocationById } from './services/workspace/getLocationById';
export type { GetLocationByIdOptions } from './services/workspace/getLocationById';
export { listLocationAssignmentsForUser } from './services/workspace/listLocationAssignmentsForUser';
export type {
  ListLocationAssignmentsForUserOptions,
  LocationAssignmentRow,
} from './services/workspace/listLocationAssignmentsForUser';