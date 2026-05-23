import { supabase } from '@/integrations/supabase/client';

/**
 * Canonical wrapper for `supabase.from('business_staff').insert(payload)`.
 *
 * - Table: `business_staff`
 * - Payload passed through unchanged (no transformation).
 * - No `.select()` / `.single()` chained — exact callsite parity.
 * - Returns raw Supabase `{ data, error }`; does not throw on its own.
 */
export interface InsertBusinessStaffOptions {
  payload: Record<string, unknown>;
}

export async function insertBusinessStaff(
  options: InsertBusinessStaffOptions,
): Promise<{ data: unknown; error: unknown }> {
  const { payload } = options;
  const { data, error } = await supabase
    .from('business_staff')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .insert(payload as any);
  return { data, error };
}