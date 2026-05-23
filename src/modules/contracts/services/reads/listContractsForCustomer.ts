/**
 * CT-2 — List contracts where `client_id = clientId`.
 * Returns raw Supabase result. Caller controls select/order/limit/count
 * exactly as before migration.
 */
import { supabase } from '@/integrations/supabase/client';

export interface ListContractsForCustomerArgs {
  clientId: string;
  select?: string;
  orderBy?: { column: string; ascending?: boolean };
  limit?: number;
  count?: { mode: 'exact' | 'planned' | 'estimated'; head?: boolean };
}

export async function listContractsForCustomer(args: ListContractsForCustomerArgs) {
  const { clientId, select = '*', orderBy, limit, count } = args;
  const selectOpts = count ? { count: count.mode, head: count.head } : undefined;
  let q = supabase
    .from('contracts')
    .select(select, selectOpts)
    .eq('client_id', clientId);
  if (orderBy) q = q.order(orderBy.column, { ascending: orderBy.ascending ?? true });
  if (typeof limit === 'number') q = q.limit(limit);
  return q;
}
