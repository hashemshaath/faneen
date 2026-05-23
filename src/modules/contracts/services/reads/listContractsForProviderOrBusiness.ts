/**
 * CT-2 — List contracts where provider_id = userId OR business_id = businessId.
 * Used by provider analytics (`DashboardAnalytics`) to combine personal + business
 * scoped contracts within a date range. Returns raw Supabase result.
 */
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';
import type { ContractReadResult } from './listContractsForCustomer';

export interface ListContractsForProviderOrBusinessArgs {
  userId: string;
  businessId: string;
  select?: string;
  /** Apply `.gte('created_at', value)` when provided. */
  gteCreatedAt?: string;
  orderBy?: { column: string; ascending?: boolean };
  limit?: number;
}

export async function listContractsForProviderOrBusiness<TRow = Tables<'contracts'>>(
  args: ListContractsForProviderOrBusinessArgs,
): Promise<ContractReadResult<TRow>> {
  const { userId, businessId, select = '*', gteCreatedAt, orderBy, limit } = args;
  let q = supabase
    .from('contracts')
    .select(select)
    .or(`provider_id.eq.${userId},business_id.eq.${businessId}`);
  if (gteCreatedAt) q = q.gte('created_at', gteCreatedAt);
  if (orderBy) q = q.order(orderBy.column, { ascending: orderBy.ascending ?? true });
  if (typeof limit === 'number') q = q.limit(limit);
  return q as unknown as Promise<ContractReadResult<TRow>>;
}