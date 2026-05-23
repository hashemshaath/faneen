/**
 * CT-2 — List contracts where `provider_id = providerId`.
 * Returns raw Supabase result (`{ data, error, count? }`). Caller-controlled
 * select / order / limit / count to preserve exact callsite behavior.
 */
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';
import type { ContractReadResult } from './listContractsForCustomer';

export interface ListContractsForOwnerArgs {
  providerId: string;
  /** Defaults to '*' to preserve historical callsite default. */
  select?: string;
  /** When provided, applies `.order(column, { ascending })`. */
  orderBy?: { column: string; ascending?: boolean };
  limit?: number;
  /** When provided, enables `.select(select, { count, head? })`. */
  count?: { mode: 'exact' | 'planned' | 'estimated'; head?: boolean };
  /**
   * Optional builder hook applied AFTER `.eq('provider_id', providerId)` and
   * BEFORE `.order(...)` / `.limit(...)`. Lets callsites that need extra
   * filters (e.g. per-client narrowing, guest email/phone OR filters) keep
   * their exact behavior without bypassing the service boundary.
   */
  customize?: <T>(q: T) => T;
}

export async function listContractsForOwner<TRow = Tables<'contracts'>>(
  args: ListContractsForOwnerArgs,
): Promise<ContractReadResult<TRow>> {
  const { providerId, select = '*', orderBy, limit, count, customize } = args;
  const selectOpts = count ? { count: count.mode, head: count.head } : undefined;
  let q = supabase
    .from('contracts')
    .select(select, selectOpts)
    .eq('provider_id', providerId);
  if (customize) q = customize(q);
  if (orderBy) q = q.order(orderBy.column, { ascending: orderBy.ascending ?? true });
  if (typeof limit === 'number') q = q.limit(limit);
  return q as unknown as Promise<ContractReadResult<TRow>>;
}
