import { supabase } from '@/integrations/supabase/client';

/**
 * Canonical wrapper for `supabase.from('profiles').select(...).eq('email', email).{maybeSingle|single}()`.
 *
 * - Table: `profiles`
 * - Filter: `email = email` (no normalization performed here — caller controls casing/trim)
 * - Terminal: `maybeSingle` (default) or `single` — preserved per callsite
 * - Select: caller-controlled; default `'user_id'`
 * - Errors: returned via `{ data, error }`; never thrown.
 */
export interface GetProfileByEmailOptions {
  email: string;
  select?: string;
  terminal?: 'single' | 'maybeSingle';
}

export async function getProfileByEmail<T = unknown>(
  options: GetProfileByEmailOptions,
): Promise<{ data: T | null; error: unknown }> {
  const { email, select = 'user_id', terminal = 'maybeSingle' } = options;
  const query = supabase.from('profiles').select(select).eq('email', email);
  const { data, error } =
    terminal === 'single' ? await query.single() : await query.maybeSingle();
  return { data: (data as unknown as T | null), error };
}