import { supabase } from '@/integrations/supabase/client';

/**
 * Thin read wrappers for `business_service_areas` (CAT-2).
 */

export interface ListServiceAreasByBusinessOptions {
  businessId: string;
  select?: string;
  order?: Array<{ column: string; ascending?: boolean }>;
}

export async function listServiceAreasByBusiness({
  businessId,
  select = '*',
  order = [],
}: ListServiceAreasByBusinessOptions) {
  let q = supabase.from('business_service_areas').select(select).eq('business_id', businessId);
  for (const o of order) q = q.order(o.column, { ascending: o.ascending ?? true });
  return await q;
}