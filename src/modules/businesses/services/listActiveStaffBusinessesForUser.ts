import { supabase } from '@/integrations/supabase/client';

/**
 * Canonical wrapper for staff-membership list reads keyed by user_id + is_active:
 *
 *   supabase.from('business_staff')
 *     .select(<select>)
 *     .eq('user_id', userId)
 *     .eq('is_active', true)
 *
 * Returns the raw `{ data, error }` shape (data is array | null).
 * Never throws; never transforms rows.
 *
 * Future replacement target for:
 *   PublicSiteScan, DashboardBadge, DashboardPrivateSectors, ActiveBusinessSwitcher.
 */
export interface ListActiveStaffBusinessesForUserOptions {
  userId: string;
  select: string;
}

export async function listActiveStaffBusinessesForUser<T = unknown>(
  options: ListActiveStaffBusinessesForUserOptions,
): Promise<{ data: T[] | null; error: unknown }> {
  const { userId, select } = options;
  const { data, error } = await supabase
    .from('business_staff')
    .select(select)
    .eq('user_id', userId)
    .eq('is_active', true);
  return { data: (data as unknown as T[] | null), error };
}