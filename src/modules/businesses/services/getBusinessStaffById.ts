import { supabase } from '@/integrations/supabase/client';

/**
 * Canonical wrapper for a single `business_staff` row lookup by primary id:
 *
 *   supabase.from('business_staff')
 *     .select(<select>)
 *     .eq('id', staffId)
 *     .maybeSingle()
 *
 * Used to resolve a branch's sales manager staff row. Returns the raw
 * `{ data, error }` shape. Never throws. Does NOT change filters,
 * ordering, or terminal — keeps the same semantics as the original
 * direct call.
 */
export interface GetBusinessStaffByIdOptions {
  staffId: string;
  select?: string;
}

export async function getBusinessStaffById<T = unknown>(
  options: GetBusinessStaffByIdOptions,
): Promise<{ data: T | null; error: unknown }> {
  const { staffId, select = 'id, user_id, role' } = options;
  const { data, error } = await supabase
    .from('business_staff')
    .select(select)
    .eq('id', staffId)
    .maybeSingle();
  return { data: data as unknown as T | null, error };
}