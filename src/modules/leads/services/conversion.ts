import { supabase } from '@/integrations/supabase/client';

export interface ContractAfterConvert {
  contract_number: string;
  provider_id: string | null;
}

/**
 * Read-only post-conversion contract lookup.
 * Used after admin_convert_lead_to_contract RPC to fetch contract_number
 * and provider_id for follow-up email dispatch.
 */
export async function getContractAfterConvert(
  contractId: string,
): Promise<ContractAfterConvert | null> {
  const { data, error } = await supabase
    .from('contracts')
    .select('contract_number, provider_id')
    .eq('id', contractId)
    .maybeSingle();
  if (error) throw error;
  return (data as ContractAfterConvert | null) ?? null;
}