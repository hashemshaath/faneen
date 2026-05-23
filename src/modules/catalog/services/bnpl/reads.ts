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

export async function listGlobalBnplProviders({
  select = '*',
  activeOnly = false,
  ids,
  order = null,
}: ListGlobalBnplProvidersOptions = {}) {
  let q = supabase.from('bnpl_providers').select(select);
  if (ids) q = q.in('id', ids);
  if (activeOnly) q = q.eq('is_active', true);
  if (order) q = q.order(order);
  return await q;
}

export interface ListBusinessBnplProvidersOptions {
  businessId: string;
  select?: string;
}

export async function listBusinessBnplProviders({
  businessId,
  select = '*',
}: ListBusinessBnplProvidersOptions) {
  return await supabase
    .from('business_bnpl_providers')
    .select(select)
    .eq('business_id', businessId);
}