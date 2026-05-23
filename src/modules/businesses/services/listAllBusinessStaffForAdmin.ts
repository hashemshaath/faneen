import { supabase } from '@/integrations/supabase/client';

/**
 * Canonical wrapper for admin full-table business_staff read:
 *
 *   supabase.from('business_staff').select(<select>)
 *
 * Returns the raw `{ data, error }` shape. Never throws; never transforms rows.
 * Future replacement target for: AdminUsers admin-business-staff query.
 */
export interface ListAllBusinessStaffForAdminOptions {
  select: string;
}

export async function listAllBusinessStaffForAdmin<T = unknown>(
  options: ListAllBusinessStaffForAdminOptions,
): Promise<{ data: T[] | null; error: unknown }> {
  const { select } = options;
  const { data, error } = await supabase.from('business_staff').select(select);
  return { data: (data as unknown as T[] | null), error };
}