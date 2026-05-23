// EDGE-2: Read provider credit balance via provider_subscriptions.
import type { SupabaseAdminLike } from './types.ts';

export async function getProviderCreditBalance(
  admin: SupabaseAdminLike,
  businessId: string,
) {
  return await admin
    .from('provider_subscriptions')
    .select('id, business_id, provider_user_id, lead_credits_balance')
    .eq('business_id', businessId)
    .maybeSingle();
}