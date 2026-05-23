import { supabase } from '@/integrations/supabase/client';

/**
 * Thin read wrappers for `warranties` (CAT-2).
 */

export interface ListWarrantiesByContractIdsOptions {
  contractIds: string[];
  select?: string;
  order?: { column: string; ascending?: boolean } | null;
}

export async function listWarrantiesByContractIds({
  contractIds,
  select = '*',
  order = null,
}: ListWarrantiesByContractIdsOptions) {
  let q = supabase.from('warranties').select(select).in('contract_id', contractIds);
  if (order) q = q.order(order.column, { ascending: order.ascending ?? true });
  return await q;
}

export interface ListWarrantiesForContractOptions {
  contractId: string;
  select?: string;
}

export async function listWarrantiesForContract({
  contractId,
  select = '*',
}: ListWarrantiesForContractOptions) {
  return await supabase.from('warranties').select(select).eq('contract_id', contractId);
}