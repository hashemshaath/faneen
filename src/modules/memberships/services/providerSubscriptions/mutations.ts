import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

/**
 * Thin write wrappers for legacy provider subscriptions (MEMB-7).
 */

export type ProviderSubscriptionUpdate =
  Database['public']['Tables']['provider_subscriptions']['Update'];

export async function updateProviderSubscriptionById({
  id,
  values,
}: {
  id: string;
  values: ProviderSubscriptionUpdate;
}) {
  const { data, error } = await supabase
    .from('provider_subscriptions')
    .update(values)
    .eq('id', id);
  return { data, error };
}

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