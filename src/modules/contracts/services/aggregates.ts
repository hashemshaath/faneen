/**
 * R2A.3 — Contracts aggregate batch read wrappers.
 *
 * Per-contract child-table batch reads used by DashboardContracts to
 * populate expanded-row detail panels. All wrappers:
 *   - short-circuit on empty `contractIds`,
 *   - use the existing Supabase client under the current user JWT,
 *   - preserve the original .select('*') / .in / .order / .limit shape,
 *   - SILENTLY swallow errors (`data ?? []`) to mirror prior callsite
 *     behavior. Adding throws here would convert previously-silent RLS
 *     denials into hard React Query error states.
 *
 * No service-role, no RLS bypass, no signed-URL generation, no mutations.
 */
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';

export type ContractMilestone   = Tables<'contract_milestones'>;
export type ContractNote        = Tables<'contract_notes'>;
export type ContractAttachment  = Tables<'contract_attachments'>;
export type ContractMeasurement = Tables<'contract_measurements'>;
export type ContractWarranty    = Tables<'warranties'>;
export type ContractMaintenance = Tables<'maintenance_requests'>;
export type ContractAmendment   = Tables<'contract_amendments'>;
export type ContractLineItem    = Tables<'contract_line_items'>;

/** Payment row enriched with a derived `contract_id` (NOT a DB column). */
export type ContractPaymentWithContractId =
  Tables<'installment_payments'> & { contract_id: string | undefined };

export async function listMilestonesForContracts(
  contractIds: string[],
): Promise<ContractMilestone[]> {
  if (contractIds.length === 0) return [];
  const { data } = await supabase
    .from('contract_milestones')
    .select('*')
    .in('contract_id', contractIds)
    .order('sort_order');
  return data ?? [];
}

export async function listNotesForContracts(
  contractIds: string[],
): Promise<ContractNote[]> {
  if (contractIds.length === 0) return [];
  const { data } = await supabase
    .from('contract_notes')
    .select('*')
    .in('contract_id', contractIds)
    .order('created_at', { ascending: false })
    .limit(200);
  return data ?? [];
}

export async function listAttachmentsForContracts(
  contractIds: string[],
): Promise<ContractAttachment[]> {
  if (contractIds.length === 0) return [];
  const { data } = await supabase
    .from('contract_attachments')
    .select('*')
    .in('contract_id', contractIds)
    .order('created_at', { ascending: false });
  return data ?? [];
}

/**
 * Two-step plan → payment fetch. Returns payments enriched with the
 * originating contract_id derived from the parent plan row. Mirrors the
 * exact mapping used previously in DashboardContracts.
 */
export async function listInstallmentPaymentsForContracts(
  contractIds: string[],
): Promise<ContractPaymentWithContractId[]> {
  if (contractIds.length === 0) return [];
  const { data: plans } = await supabase
    .from('installment_plans')
    .select('id, contract_id')
    .in('contract_id', contractIds);
  if (!plans || plans.length === 0) return [];
  const planIds = plans.map((p) => p.id);
  const { data: payments } = await supabase
    .from('installment_payments')
    .select('*')
    .in('plan_id', planIds);
  return (payments ?? []).map((p) => ({
    ...p,
    contract_id: plans.find((pl) => pl.id === p.plan_id)?.contract_id,
  }));
}

export async function listMeasurementsForContracts(
  contractIds: string[],
): Promise<ContractMeasurement[]> {
  if (contractIds.length === 0) return [];
  const { data } = await supabase
    .from('contract_measurements')
    .select('*')
    .in('contract_id', contractIds);
  return data ?? [];
}

export async function listWarrantiesForContracts(
  contractIds: string[],
): Promise<ContractWarranty[]> {
  if (contractIds.length === 0) return [];
  const { data } = await supabase
    .from('warranties')
    .select('*')
    .in('contract_id', contractIds);
  return data ?? [];
}

export async function listMaintenanceRequestsForContracts(
  contractIds: string[],
): Promise<ContractMaintenance[]> {
  if (contractIds.length === 0) return [];
  const { data } = await supabase
    .from('maintenance_requests')
    .select('*')
    .in('contract_id', contractIds)
    .order('created_at', { ascending: false });
  return data ?? [];
}

export async function listAmendmentsForContracts(
  contractIds: string[],
): Promise<ContractAmendment[]> {
  if (contractIds.length === 0) return [];
  const { data } = await supabase
    .from('contract_amendments')
    .select('*')
    .in('contract_id', contractIds)
    .order('created_at', { ascending: false });
  return data ?? [];
}

export async function listLineItemsForContracts(
  contractIds: string[],
): Promise<ContractLineItem[]> {
  if (contractIds.length === 0) return [];
  const { data } = await supabase
    .from('contract_line_items')
    .select('*')
    .in('contract_id', contractIds)
    .order('sort_order');
  return data ?? [];
}