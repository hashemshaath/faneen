import { supabase } from '@/integrations/supabase/client';

/**
 * Canonical wrapper for `supabase.from('profiles').select(...).eq('user_id', userId).{maybeSingle|single}()`.
 *
 * - Table: `profiles`
 * - Filter: `user_id = userId`
 * - Terminal: `maybeSingle` (default) or `single` — preserved per callsite
 * - Select: caller-controlled; default `'*'`
 * - Errors: returned via `{ data, error }`; never thrown.
 */
export interface GetProfileByUserIdOptions {
  userId: string;
  select?: string;
  terminal?: 'single' | 'maybeSingle';
}

export async function getProfileByUserId<T = unknown>(
  options: GetProfileByUserIdOptions,
): Promise<{ data: T | null; error: unknown }> {
  const { userId, select = '*', terminal = 'maybeSingle' } = options;
  const query = supabase.from('profiles').select(select).eq('user_id', userId);
  const { data, error } =
    terminal === 'single' ? await query.single() : await query.maybeSingle();
  return { data: (data as unknown as T | null), error };
}