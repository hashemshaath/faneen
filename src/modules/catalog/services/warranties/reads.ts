import { supabase } from '@/integrations/supabase/client';

/**
 * Thin read wrappers for `warranties` (CAT-2).
 */

export interface ListWarrantiesByContractIdsOptions {
  contractIds: string[];
  select?: string;
  order?: { column: string; ascending?: boolean } | null;
}

export async function listWarrantiesByContractIds<T = unknown>({
  contractIds,
  select = '*',
  order = null,
}: ListWarrantiesByContractIdsOptions): Promise<{ data: T[] | null; error: unknown }> {
  let q = supabase.from('warranties').select(select).in('contract_id', contractIds);
  if (order) q = q.order(order.column, { ascending: order.ascending ?? true });
  const { data, error } = await q;
  return { data: data as unknown as T[] | null, error };
}

export interface ListWarrantiesForContractOptions {
  contractId: string;
  select?: string;
}

export async function listWarrantiesForContract<T = unknown>({
  contractId,
  select = '*',
}: ListWarrantiesForContractOptions): Promise<{ data: T[] | null; error: unknown }> {
  const { data, error } = await supabase.from('warranties').select(select).eq('contract_id', contractId);
  return { data: data as unknown as T[] | null, error };
}