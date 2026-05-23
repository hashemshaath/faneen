import { supabase } from '@/integrations/supabase/client';

/**
 * Thin read wrappers for `business_availability` (CAT-2).
 */

export interface ListAvailabilityByBusinessOptions {
  businessId: string;
  select?: string;
  activeOnly?: boolean;
  order?: string | null;
}

export async function listAvailabilityByBusiness<T = unknown>({
  businessId,
  select = '*',
  activeOnly = false,
  order = null,
}: ListAvailabilityByBusinessOptions): Promise<{ data: T[] | null; error: unknown }> {
  let q = supabase.from('business_availability').select(select).eq('business_id', businessId);
  if (activeOnly) q = q.eq('is_active', true);
  if (order) q = q.order(order);
  const { data, error } = await q;
  return { data: data as unknown as T[] | null, error };
}

/** Public availability read (active rows only). */
export async function listPublicAvailabilityByBusiness<T = unknown>(
  args: Omit<ListAvailabilityByBusinessOptions, 'activeOnly'>,
) {
  return listAvailabilityByBusiness<T>({ ...args, activeOnly: true });
}