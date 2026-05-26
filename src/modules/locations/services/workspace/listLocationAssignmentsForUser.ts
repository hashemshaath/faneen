/**
 * WORKSPACE-CONTEXT-2 — Optional wrapper exposing the user's
 * per-location staff assignments (location_staff_assignments).
 *
 * Filters by staff_membership_id → business_staff.user_id via embedded
 * join, and (optionally) entityId via the same join. RLS on
 * `location_staff_assignments` and `business_staff` remains authoritative.
 */
import { supabase } from '@/integrations/supabase/client';

export interface LocationAssignmentRow {
  id: string;
  location_id: string;
  location_table: string;
  role: string | null;
  permissions_override: Record<string, unknown> | null;
  status: string;
  staff_membership_id: string;
}

export interface ListLocationAssignmentsForUserOptions {
  userId: string;
  entityId?: string;
}

export async function listLocationAssignmentsForUser(
  options: ListLocationAssignmentsForUserOptions,
): Promise<{ data: LocationAssignmentRow[] | null; error: unknown }> {
  const { userId, entityId } = options;
  let q = supabase
    .from('location_staff_assignments')
    .select(
      'id, location_id, location_table, role, permissions_override, status, staff_membership_id, business_staff!inner(user_id, business_id)'
    )
    .eq('status', 'active')
    .eq('business_staff.user_id', userId);
  if (entityId) q = q.eq('business_staff.business_id', entityId);
  const { data, error } = await q;
  return { data: (data as unknown as LocationAssignmentRow[] | null), error };
}