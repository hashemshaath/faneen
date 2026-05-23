/**
 * P-24: This lead-module service now delegates to the canonical
 * `getBusinessProviderContactForEmail` wrapper in
 * `src/modules/businesses/services/`. The canonical wrapper performs the
 * `businesses` lookup and routes the profile email fallback through the
 * canonical `getProfileByUserId` users service, so both businesses and
 * profiles direct reads are removed from this file.
 *
 * The exported name, signature, and behavior are preserved verbatim.
 */
import {
  getBusinessProviderContactForEmail,
  type BusinessProviderContactForEmail,
  type GetBusinessProviderContactForEmailOptions,
} from '@/modules/businesses/services/getBusinessProviderContactForEmail';

export type GetLeadProviderContactForEmailParams =
  GetBusinessProviderContactForEmailOptions;
export type LeadProviderContactForEmail = BusinessProviderContactForEmail;

export async function getLeadProviderContactForEmail(
  params: GetLeadProviderContactForEmailParams,
): Promise<LeadProviderContactForEmail> {
  return getBusinessProviderContactForEmail(params);
}