/**
 * CT-2 — List contracts where the user is either client OR provider.
 * Applies `.or('client_id.eq.<userId>,provider_id.eq.<userId>')`.
 * Returns raw Supabase result.
 */
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';
import type { ContractReadResult } from './listContractsForCustomer';

export interface ListContractsForUserParticipantArgs {
  userId: string;
  select?: string;
  orderBy?: { column: string; ascending?: boolean };
  limit?: number;
  count?: { mode: 'exact' | 'planned' | 'estimated'; head?: boolean };
  /** Apply `.gte('created_at', value)` when provided. */
  gteCreatedAt?: string;
}

export async function listContractsForUserParticipant<TRow = Tables<'contracts'>>(
  args: ListContractsForUserParticipantArgs,
): Promise<ContractReadResult<TRow>> {
  const { userId, select = '*', orderBy, limit, count, gteCreatedAt } = args;
  const selectOpts = count ? { count: count.mode, head: count.head } : undefined;
  let q = supabase
    .from('contracts')
    .select(select, selectOpts)
    .or(`client_id.eq.${userId},provider_id.eq.${userId}`);
  if (gteCreatedAt) q = q.gte('created_at', gteCreatedAt);
  if (orderBy) q = q.order(orderBy.column, { ascending: orderBy.ascending ?? true });
  if (typeof limit === 'number') q = q.limit(limit);
  return q as unknown as Promise<ContractReadResult<TRow>>;
}
