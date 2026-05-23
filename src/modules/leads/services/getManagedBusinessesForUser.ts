/**
 * P-24: This lead-module service now delegates to the canonical
 * `listManagedBusinessesForUser` wrapper in `src/modules/businesses/services/`.
 * The exported name, signature, and behavior are preserved so existing
 * callsites and `src/modules/leads/index.ts` exports keep working. Direct
 * `businesses` reads no longer happen here.
 */
import {
  listManagedBusinessesForUser,
  type ManagedBusiness,
} from '@/modules/businesses/services/listManagedBusinessesForUser';

export type { ManagedBusiness };

export async function getManagedBusinessesForUser(
  userId: string,
): Promise<ManagedBusiness[]> {
  return listManagedBusinessesForUser(userId);
}