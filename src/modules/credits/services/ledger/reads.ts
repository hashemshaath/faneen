import { supabase } from '@/integrations/supabase/client';

/**
 * Provider lead credit transaction (ledger) read wrappers.
 * Mirrors the exact behavior of the previously inlined queries in
 * `ProviderMembership.tsx` and `AdminProviderSubscriptions.tsx`.
 */

const PROVIDER_LEDGER_DEFAULT_SELECT =
  'id, type, amount, balance_after, reason, quote_request_lead_id, created_at';
const ADMIN_LEDGER_DEFAULT_SELECT =
  'id, type, amount, balance_after, reason, created_at, created_by, quote_request_lead_id';

export interface ListProviderCreditTransactionsForBusinessesOptions {
  businessIds: string[];
  select?: string;
  limit?: number;
}

export async function listProviderCreditTransactionsForBusinesses<T = unknown>({
  businessIds,
  select = PROVIDER_LEDGER_DEFAULT_SELECT,
  limit = 100,
}: ListProviderCreditTransactionsForBusinessesOptions): Promise<{
  data: T[] | null;
  error: unknown;
}> {
  const { data, error } = await supabase
    .from('provider_lead_credit_transactions')
    .select(select)
    .in('business_id', businessIds)
    .order('created_at', { ascending: false })
    .limit(limit);
  return { data: data as unknown as T[] | null, error };
}

export interface ListProviderCreditTransactionsForBusinessOptions {
  businessId: string;
  select?: string;
  limit?: number;
}

export async function listProviderCreditTransactionsForBusiness<T = unknown>({
  businessId,
  select = ADMIN_LEDGER_DEFAULT_SELECT,
  limit = 10,
}: ListProviderCreditTransactionsForBusinessOptions): Promise<{
  data: T[] | null;
  error: unknown;
}> {
  const { data, error } = await supabase
    .from('provider_lead_credit_transactions')
    .select(select)
    .eq('business_id', businessId)
    .order('created_at', { ascending: false })
    .limit(limit);
  return { data: data as unknown as T[] | null, error };
}