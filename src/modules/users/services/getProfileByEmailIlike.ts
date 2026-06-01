import { supabase } from '@/integrations/supabase/client';

/**
 * Canonical wrapper for `supabase.from('profiles').select(...).ilike('email', email).{maybeSingle|single}()`.
 *
 * Used by invitation flows that need a case-insensitive email lookup.
 * Caller is responsible for trimming the email before calling.
 *
 * - Table: `profiles`
 * - Filter: `email ILIKE email`
 * - Terminal: `maybeSingle` (default) or `single`
 * - Select: caller-controlled; default `'user_id'`
 * - Returns raw `{ data, error }`; never throws.
 */
export interface GetProfileByEmailIlikeOptions {
  email: string;
  select?: string;
  terminal?: 'single' | 'maybeSingle';
}

export async function getProfileByEmailIlike<T = unknown>(
  options: GetProfileByEmailIlikeOptions,
): Promise<{ data: T | null; error: unknown }> {
  const { email, select = 'user_id', terminal = 'maybeSingle' } = options;
  const query = supabase.from('profiles').select(select).ilike('email', email);
  const { data, error } =
    terminal === 'single' ? await query.single() : await query.maybeSingle();
  return { data: data as unknown as T | null, error };
}