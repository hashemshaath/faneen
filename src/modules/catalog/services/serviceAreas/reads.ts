import { supabase } from '@/integrations/supabase/client';

/**
 * Thin read wrappers for `business_service_areas` (CAT-2).
 */

export interface ListServiceAreasByBusinessOptions {
  businessId: string;
  select?: string;
  order?: Array<{ column: string; ascending?: boolean }>;
}

export async function listServiceAreasByBusiness<T = unknown>({
  businessId,
  select = '*',
  order = [],
}: ListServiceAreasByBusinessOptions): Promise<{ data: T[] | null; error: unknown }> {
  let q = supabase.from('business_service_areas').select(select).eq('business_id', businessId);
  for (const o of order) q = q.order(o.column, { ascending: o.ascending ?? true });
  const { data, error } = await q;
  return { data: data as unknown as T[] | null, error };
}