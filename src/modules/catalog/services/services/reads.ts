import { supabase } from '@/integrations/supabase/client';

/**
 * Thin read wrappers for `business_services` (CAT-2).
 *
 * Wrappers return the raw Supabase response (`{ data, error, count, ... }`)
 * so callsites that previously destructured these fields keep working
 * verbatim. No filters, ordering, or selects are added/removed beyond
 * what each callsite already specified.
 */

export interface ListServicesByBusinessOptions {
  businessId: string;
  select?: string;
  activeOnly?: boolean;
  /** Column to order by ascending; pass `null` to skip ordering. */
  order?: string | null;
}

export async function listServicesByBusiness({
  businessId,
  select = '*',
  activeOnly = true,
  order = 'sort_order',
}: ListServicesByBusinessOptions) {
  let q = supabase.from('business_services').select(select).eq('business_id', businessId);
  if (activeOnly) q = q.eq('is_active', true);
  if (order) q = q.order(order);
  return await q;
}

export interface CountServicesByBusinessOptions {
  businessId: string;
  activeOnly?: boolean;
}

export async function countServicesByBusiness({
  businessId,
  activeOnly = false,
}: CountServicesByBusinessOptions) {
  let q = supabase
    .from('business_services')
    .select('id', { count: 'exact', head: true })
    .eq('business_id', businessId);
  if (activeOnly) q = q.eq('is_active', true);
  return await q;
}