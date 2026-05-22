import { supabase } from '@/integrations/supabase/client';

export interface CreateOrGetLeadConversationParams {
  _lead_id: string;
}

/**
 * E3: Wraps the create_or_get_lead_conversation RPC previously inlined in
 * DashboardLeads.tsx. Preserves exact params shape and return shape so callers
 * can destructure { data, error } exactly as before.
 */
export async function createOrGetLeadConversation(params: CreateOrGetLeadConversationParams) {
  return supabase.rpc('create_or_get_lead_conversation', params);
}
