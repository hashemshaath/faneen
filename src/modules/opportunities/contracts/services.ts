/**
 * OPPORTUNITIES PHASE 7 — contract conversion service.
 *
 * Wraps the `convert_awarded_bid_to_contract` SECURITY DEFINER RPC.
 * RLS / RPC guards reject providers and unauthorised users; we never bypass.
 */
import { supabase } from '@/integrations/supabase/client';

export async function convertAwardedBidToContract(
  opportunityId: string,
  bidId: string,
): Promise<string> {
  const { data, error } = await supabase.rpc('convert_awarded_bid_to_contract', {
    p_opportunity_id: opportunityId,
    p_bid_id: bidId,
  });
  if (error) throw error;
  if (!data) throw new Error('contract_conversion_failed');
  return data as string;
}

export interface OpportunityContractRef {
  id: string;
  contract_number: string;
  status: string;
}

export async function getContractForOpportunity(
  opportunityId: string,
): Promise<OpportunityContractRef | null> {
  const { data, error } = await supabase
    .from('contracts')
    .select('id, contract_number, status')
    .eq('opportunity_id', opportunityId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return (data as OpportunityContractRef | null) ?? null;
}
