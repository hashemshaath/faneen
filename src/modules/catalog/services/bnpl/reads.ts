import { supabase } from '@/integrations/supabase/client';

/**
 * Thin read wrappers for `bnpl_providers` (global catalog) and
 * `business_bnpl_providers` (per-business enablement) (CAT-2).
 */

export interface ListGlobalBnplProvidersOptions {
  select?: string;
  activeOnly?: boolean;
  ids?: string[];
  order?: string | null;
}

export async function listGlobalBnplProviders<T = unknown>({
  select = '*',
  activeOnly = false,
  ids,
  order = null,
}: ListGlobalBnplProvidersOptions = {}): Promise<{ data: T[] | null; error: unknown }> {
  let q = supabase.from('bnpl_providers').select(select);
  if (ids) q = q.in('id', ids);
  if (activeOnly) q = q.eq('is_active', true);
  if (order) q = q.order(order);
  const { data, error } = await q;
  return { data: data as unknown as T[] | null, error };
}

export interface ListBusinessBnplProvidersOptions {
  businessId: string;
  select?: string;
}

export async function listBusinessBnplProviders<T = unknown>({
  businessId,
  select = '*',
}: ListBusinessBnplProvidersOptions): Promise<{ data: T[] | null; error: unknown }> {
  const { data, error } = await supabase
    .from('business_bnpl_providers')
    .select(select)
    .eq('business_id', businessId);
  return { data: data as unknown as T[] | null, error };
}