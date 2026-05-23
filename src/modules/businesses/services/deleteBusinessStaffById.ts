import { supabase } from '@/integrations/supabase/client';

/**
 * Canonical wrapper for `supabase.from('business_staff').delete().eq('id', id)`.
 *
 * - Table: `business_staff`
 * - Filter: `id = id`
 * - Returns raw Supabase `{ data, error }`; does not throw on its own.
 */
export interface DeleteBusinessStaffByIdOptions {
  id: string;
}

export async function deleteBusinessStaffById(
  options: DeleteBusinessStaffByIdOptions,
): Promise<{ data: unknown; error: unknown }> {
  const { id } = options;
  const { data, error } = await supabase
    .from('business_staff')
    .delete()
    .eq('id', id);
  return { data, error };
}