/**
 * CT-2 — List contracts where `provider_id = providerId`.
 * Returns raw Supabase result (`{ data, error, count? }`). Caller-controlled
 * select / order / limit / count to preserve exact callsite behavior.
 */
import { supabase } from '@/integrations/supabase/client';

export interface ListContractsForOwnerArgs {
  providerId: string;
  /** Defaults to '*' to preserve historical callsite default. */
  select?: string;
  /** When provided, applies `.order(column, { ascending })`. */
  orderBy?: { column: string; ascending?: boolean };
  limit?: number;
  /** When provided, enables `.select(select, { count, head? })`. */
  count?: { mode: 'exact' | 'planned' | 'estimated'; head?: boolean };
}

export async function listContractsForOwner(args: ListContractsForOwnerArgs) {
  const { providerId, select = '*', orderBy, limit, count } = args;
  const selectOpts = count ? { count: count.mode, head: count.head } : undefined;
  let q = supabase
    .from('contracts')
    .select(select, selectOpts)
    .eq('provider_id', providerId);
  if (orderBy) q = q.order(orderBy.column, { ascending: orderBy.ascending ?? true });
  if (typeof limit === 'number') q = q.limit(limit);
  return q;
}
