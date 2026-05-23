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

export async function listAvailabilityByBusiness({
  businessId,
  select = '*',
  activeOnly = false,
  order = null,
}: ListAvailabilityByBusinessOptions) {
  let q = supabase.from('business_availability').select(select).eq('business_id', businessId);
  if (activeOnly) q = q.eq('is_active', true);
  if (order) q = q.order(order);
  return await q;
}

/** Public availability read (active rows only). */
export async function listPublicAvailabilityByBusiness(
  args: Omit<ListAvailabilityByBusinessOptions, 'activeOnly'>,
) {
  return listAvailabilityByBusiness({ ...args, activeOnly: true });
}