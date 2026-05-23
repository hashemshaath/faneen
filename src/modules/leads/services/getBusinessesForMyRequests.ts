/**
 * P-24: This lead-module service now delegates to the canonical
 * `listBusinessesForRequests` wrapper in `src/modules/businesses/services/`.
 * Exported name, signature, and behavior preserved. No direct `businesses`
 * reads remain here.
 */
import {
  listBusinessesForRequests,
  type RequestsBusiness,
} from '@/modules/businesses/services/listBusinessesForRequests';

export type MyRequestsBusiness = RequestsBusiness;

export async function getBusinessesForMyRequests(
  businessIds: string[],
): Promise<MyRequestsBusiness[]> {
  return listBusinessesForRequests(businessIds);
}