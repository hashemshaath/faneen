import { supabase } from '@/integrations/supabase/client';

export interface GetLeadProviderContactForEmailParams {
  businessId: string;
  /**
   * Optional contract.provider_id resolved from the post-conversion contract.
   * When provided, it takes precedence over the business owner user_id for the
   * profiles email fallback — matching the original page logic:
   *   providerUserId = contract?.provider_id || business?.user_id
   */
  contractProviderUserId?: string | null;
}

export interface LeadProviderContactForEmail {
  businessName?: string;
  providerEmail?: string;
  providerUserId?: string;
}

/**
 * D4: Wraps the businesses + profiles fallback lookup previously inlined in
 * AdminLeadRequests.tsx. Preserves exact select strings, filters, maybeSingle
 * semantics, and email resolution priority (business.email first, profile
 * fallback only when business email is missing).
 */
export async function getLeadProviderContactForEmail(
  params: GetLeadProviderContactForEmailParams,
): Promise<LeadProviderContactForEmail> {
  const { businessId, contractProviderUserId } = params;

  const { data: business } = await supabase
    .from('businesses')
    .select('name_ar, name_en, user_id, email')
    .eq('id', businessId)
    .maybeSingle();

  const businessName = business?.name_ar || business?.name_en || undefined;
  const providerUserId = contractProviderUserId || business?.user_id || undefined;
  let providerEmail: string | undefined = business?.email || undefined;

  if (!providerEmail && providerUserId) {
    const { data: prof } = await supabase
      .from('profiles').select('email').eq('user_id', providerUserId).maybeSingle();
    providerEmail = prof?.email || undefined;
  }

  return { businessName, providerEmail, providerUserId };
}