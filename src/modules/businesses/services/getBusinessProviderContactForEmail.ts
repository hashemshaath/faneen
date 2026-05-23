import { supabase } from '@/integrations/supabase/client';
import { getProfileByUserId } from '@/modules/users/services/getProfileByUserId';

/**
 * P-24: Canonical business/provider contact lookup used by lead email flows.
 *
 * Preserves the exact behavior previously inlined in
 * `getLeadProviderContactForEmail` (the lead-module service):
 *   1. `businesses` row read by id with `name_ar, name_en, user_id, email`
 *      via `maybeSingle()`.
 *   2. `businessName` resolved as `name_ar || name_en || undefined`.
 *   3. `providerUserId` resolved as `contractProviderUserId || business.user_id`.
 *   4. `providerEmail` priority: `business.email` first; if missing AND a
 *      `providerUserId` is available, fall back to `profiles.email` via the
 *      canonical `getProfileByUserId` wrapper (so profiles access stays
 *      isolated to `src/modules/users/services/`).
 *
 * Errors from the underlying queries are swallowed exactly as before
 * (only `data` is read); the returned shape always has the three
 * optional fields.
 */
export interface GetBusinessProviderContactForEmailOptions {
  businessId: string;
  contractProviderUserId?: string | null;
}

export interface BusinessProviderContactForEmail {
  businessName?: string;
  providerEmail?: string;
  providerUserId?: string;
}

export async function getBusinessProviderContactForEmail(
  options: GetBusinessProviderContactForEmailOptions,
): Promise<BusinessProviderContactForEmail> {
  const { businessId, contractProviderUserId } = options;

  const { data: business } = await supabase
    .from('businesses')
    .select('name_ar, name_en, user_id, email')
    .eq('id', businessId)
    .maybeSingle();

  const businessName = business?.name_ar || business?.name_en || undefined;
  const providerUserId = contractProviderUserId || business?.user_id || undefined;
  let providerEmail: string | undefined = business?.email || undefined;

  if (!providerEmail && providerUserId) {
    const { data: prof } = await getProfileByUserId<{ email: string | null }>({
      userId: providerUserId,
      select: 'email',
    });
    providerEmail = prof?.email || undefined;
  }

  return { businessName, providerEmail, providerUserId };
}