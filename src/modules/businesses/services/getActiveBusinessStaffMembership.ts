import { supabase } from '@/integrations/supabase/client';

/**
 * Canonical wrapper for the active business_staff membership probe:
 *
 *   supabase.from('business_staff')
 *     .select(<select>)
 *     .eq('user_id', userId)
 *     .eq('is_active', true)
 *     .limit(1)
 *     .maybeSingle()
 *
 * Used by AuthContext provider-access probe and DashboardAccountDiagnostics.
 * Returns the raw `{ data, error }` shape. Never throws.
 *
 * Does NOT broaden permissions: keeps both `user_id` and `is_active`
 * filters and the `.limit(1).maybeSingle()` terminal exactly as before.
 */
export interface GetActiveBusinessStaffMembershipOptions {
  userId: string;
  select?: string;
}

export async function getActiveBusinessStaffMembership<T = unknown>(
  options: GetActiveBusinessStaffMembershipOptions,
): Promise<{ data: T | null; error: unknown }> {
  const { userId, select = 'id' } = options;
  const { data, error } = await supabase
    .from('business_staff')
    .select(select)
    .eq('user_id', userId)
    .eq('is_active', true)
    .limit(1)
    .maybeSingle();
  return { data: (data as unknown as T | null), error };
}