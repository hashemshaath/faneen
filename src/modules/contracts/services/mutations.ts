/**
 * R2A.4 — Contract mutation service wrappers.
 *
 * Thin pass-through over SECURITY DEFINER RPCs. Behavior preserved:
 *  - All wrappers throw on RPC error EXCEPT `recalcContractTotal`, which
 *    swallows errors to match the existing call sites that fire-and-forget.
 *  - Argument shapes match the real call sites verbatim.
 */
import { supabase } from '@/integrations/supabase/client';
import { emitContractAudit, readContractStatusSafe } from './emitContractAudit';

export async function acceptContract(contractId: string): Promise<unknown> {
  const { data, error } = await supabase.rpc('accept_contract', { _contract_id: contractId });
  if (error) throw error;
  // BUSINESS-CORE-14 — accept_contract is the signing event for the Unified Operations Feed.
  await emitContractAudit({
    contractId,
    action: 'contract.signed',
  });
  return data ?? null;
}

export async function sendContractForApproval(contractId: string): Promise<void> {
  const previousStatus = await readContractStatusSafe(contractId);
  const { error } = await supabase.rpc('send_contract_for_approval', { _contract_id: contractId });
  if (error) throw error;
  // BUSINESS-CORE-14 — status transition into the approval queue.
  await emitContractAudit({
    contractId,
    action: 'contract.status_changed',
    previousStatus,
  });
}

export interface CloneContractAsDraftArgs {
  sourceContractId: string;
  includeLineItems?: boolean;
  includeTerms?: boolean;
  includeSupervisor?: boolean;
}

export async function cloneContractAsDraft(args: CloneContractAsDraftArgs): Promise<unknown> {
  const { data, error } = await supabase.rpc('clone_contract_as_draft', {
    _source_contract_id: args.sourceContractId,
    _include_line_items: args.includeLineItems ?? true,
    _include_terms: args.includeTerms ?? true,
    _include_supervisor: args.includeSupervisor ?? true,
  });
  if (error) throw error;
  return data ?? null;
}

/**
 * Recompute contract total. Preserves current fire-and-forget semantics —
 * existing call sites do not check the error, so we swallow here too.
 */
export async function recalcContractTotal(contractId: string): Promise<void> {
  try {
    await supabase.rpc('recalc_contract_total', { _contract_id: contractId });
  } catch {
    // intentionally swallowed
  }
}

export async function setContractExecutionSite(
  contractId: string,
  siteId: string | null | undefined,
): Promise<void> {
  const { error } = await supabase.rpc('set_contract_execution_site', {
    _contract_id: contractId,
    _site_id: siteId ?? undefined,
  });
  if (error) throw error;
}

export async function linkLeadToContract(contractId: string, leadId: string): Promise<unknown> {
  const { data, error } = await supabase.rpc('link_lead_to_contract', {
    _lead_id: leadId,
    _contract_id: contractId,
  });
  if (error) throw error;
  return data ?? null;
}

export async function completeContractFromInvitation(inviteId: string): Promise<string> {
  const { data, error } = await supabase.rpc('complete_contract_from_invitation', { _invite_id: inviteId });
  if (error) throw error;
  return data as string;
}