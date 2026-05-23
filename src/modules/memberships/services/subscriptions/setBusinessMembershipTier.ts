import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

export type MembershipTier = Database['public']['Enums']['membership_tier'];

export interface AdminSetBusinessMembershipTierResult {
  business_id: string;
  tier: MembershipTier;
  subscription_id: string;
  previous_subscription_id: string | null;
  changed: boolean;
}

/**
 * R4E-2C-4-PHASE-3: canonical admin entry point for changing a business
 * membership tier. Routes through the membership-owned RPC which mutates
 * `membership_subscriptions`, mirrors `businesses.membership_tier` /
 * `profiles.membership_tier`, and writes the audit log row.
 *
 * Never touch `provider_subscriptions` or credits from here.
 */
export async function setBusinessMembershipTier(
  businessId: string,
  tier: MembershipTier,
  reason?: string,
): Promise<AdminSetBusinessMembershipTierResult> {
  const { data, error } = await supabase.rpc('admin_set_business_membership_tier', {
    _business_id: businessId,
    _tier: tier,
    _reason: reason ?? null,
  });

  if (error) throw error;

  return data as unknown as AdminSetBusinessMembershipTierResult;
}