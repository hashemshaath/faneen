import { supabase } from '@/integrations/supabase/client';

/**
 * L-4: thin wrappers around the lead-related contract RPCs.
 * Each call preserves the exact RPC name and params shape used by
 * the original callsites in DashboardContracts and ContractDetail.
 * Returns raw Supabase { data, error } — no transformation, no throw.
 */

export async function prepareContractPrefillFromLead(params: { _lead_id: string }) {
  return await supabase.rpc('prepare_contract_prefill_from_lead', params);
}

export async function getContractSourceLeadSummary(params: { _contract_id: string }) {
  return await supabase.rpc('get_contract_source_lead_summary', params);
}