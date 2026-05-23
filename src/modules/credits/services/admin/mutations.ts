import { supabase } from '@/integrations/supabase/client';

/**
 * Admin credit-adjustment RPC wrapper (CRED-3).
 * Canonical location for credit-domain admin mutations.
 * Previously lived in `src/modules/memberships/services/providerSubscriptions/mutations.ts`.
 */

export interface AdminAdjustProviderCreditsArgs {
  p_subscription_id: string;
  p_action: 'grant' | 'refund' | 'adjustment';
  p_amount: number;
  p_reason: string;
  p_note: string | null;
  p_quote_request_lead_id: string | null;
}

export async function adminAdjustProviderCredits(args: AdminAdjustProviderCreditsArgs) {
  const { data, error } = await supabase.rpc('admin_adjust_provider_credits', args);
  return { data, error };
}