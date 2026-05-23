import { supabase } from '@/integrations/supabase/client';

/**
 * Canonical wrapper for `supabase.from('business_staff').update(values).eq('id', id)`.
 *
 * - Table: `business_staff`
 * - Filter: `id = id`
 * - Values passed through unchanged.
 * - No `.select()` / `.single()` chained — exact callsite parity.
 * - Returns raw Supabase `{ data, error }`; does not throw on its own.
 */
export interface UpdateBusinessStaffByIdOptions {
  id: string;
  values: Record<string, unknown>;
}

export async function updateBusinessStaffById(
  options: UpdateBusinessStaffByIdOptions,
): Promise<{ data: unknown; error: unknown }> {
  const { id, values } = options;
  const { data, error } = await supabase
    .from('business_staff')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .update(values as any)
    .eq('id', id);
  return { data, error };
}