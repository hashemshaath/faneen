import { supabase } from '@/integrations/supabase/client';

/**
 * Canonical wrapper for `supabase.from('profiles').update(values).eq('user_id', userId)`.
 *
 * - Table: `profiles`
 * - Filter: `user_id = userId`
 * - Values: passed through unchanged
 * - Returns raw Supabase `{ data, error }`; never throws
 */
export interface UpdateProfileOptions {
  userId: string;
  values: Record<string, unknown>;
}

export async function updateProfile(
  options: UpdateProfileOptions,
): Promise<{ data: unknown; error: unknown }> {
  const { userId, values } = options;
  const { data, error } = await supabase
    .from('profiles')
    .update(values)
    .eq('user_id', userId);
  return { data, error };
}