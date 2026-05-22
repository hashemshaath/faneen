import { supabase } from '@/integrations/supabase/client';

/**
 * Admin-only RPC: convert a lead_request into a draft contract.
 *
 * @param leadId The lead_requests.id to convert.
 * @returns The created contract id (string).
 * @throws When the RPC returns an error (permissions, already_converted, etc.).
 */
export async function adminConvertLeadToContract(leadId: string): Promise<string> {
  const { data, error } = await supabase.rpc('admin_convert_lead_to_contract', {
    _lead_id: leadId,
  });
  if (error) throw error;
  return data as string;
}
