import { supabase } from '@/integrations/supabase/client';

/**
 * Canonical count wrapper for pending `business_staff_invitations` rows
 * scoped to a single business. Used by Staff Center KPI strips.
 *
 * - Table: `business_staff_invitations`
 * - Filter: `business_id = $1 AND status = 'pending'`
 * - Returns the row count (or 0 when unknown). Errors are swallowed
 *   into 0 to keep KPI strips resilient — callers should not rely on
 *   this wrapper to surface load errors.
 */
export async function countPendingStaffInvitationsForBusiness(
  businessId: string,
): Promise<number> {
  if (!businessId) return 0;
  const { count } = await supabase
    .from('business_staff_invitations')
    .select('id', { count: 'exact', head: true })
    .eq('business_id', businessId)
    .eq('status', 'pending');
  return count ?? 0;
}