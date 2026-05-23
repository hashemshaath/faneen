/**
 * CT-4 — Contract milestones child-table service wrappers.
 * Thin pass-through over the `contract_milestones` table.
 */
import { supabase } from '@/integrations/supabase/client';

export async function listContractMilestones(contractId: string) {
  return await supabase
    .from('contract_milestones')
    .select('*')
    .eq('contract_id', contractId)
    .order('sort_order');
}

export async function createContractMilestone(payload: Record<string, unknown>) {
  return await supabase.from('contract_milestones').insert(payload as never);
}

export async function updateContractMilestone(
  milestoneId: string,
  update: Record<string, unknown>,
) {
  return await supabase
    .from('contract_milestones')
    .update(update as never)
    .eq('id', milestoneId);
}

export async function deleteContractMilestone(milestoneId: string) {
  return await supabase.from('contract_milestones').delete().eq('id', milestoneId);
}