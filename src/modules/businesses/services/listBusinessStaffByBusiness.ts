import { supabase } from '@/integrations/supabase/client';

/**
 * ORG-RBAC-STRUCTURE-5 — Canonical scoped wrapper for `business_staff`
 * filtered by `business_id`. Returns the raw `{ data, error }` shape; never
 * throws, never transforms rows. Pages and components MUST NOT call
 * `supabase.from('business_staff')` directly.
 */
export interface ListBusinessStaffByBusinessOptions {
  businessId: string;
  select?: string;
  includeInactive?: boolean;
}

export async function listBusinessStaffByBusiness<T = unknown>(
  options: ListBusinessStaffByBusinessOptions,
): Promise<{ data: T[] | null; error: unknown }> {
  const { businessId, select = '*', includeInactive = false } = options;
  let q = supabase.from('business_staff').select(select).eq('business_id', businessId);
  if (!includeInactive) q = q.eq('is_active', true);
  const { data, error } = await q;
  return { data: (data as unknown as T[] | null), error };
}