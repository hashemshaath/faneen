import { supabase } from '@/integrations/supabase/client';

/**
 * Canonical wrapper for `supabase.from('profiles').select(...).in('user_id', userIds)`.
 *
 * - Table: `profiles`
 * - Filter: `user_id IN (userIds)`
 * - Select: caller-controlled; default `'user_id, full_name, avatar_url'`
 * - Empty input: returns `{ data: [], error: null }` without hitting Supabase.
 * - Errors: returned via `{ data, error }`; never thrown.
 */
export interface ListProfilesByUserIdsOptions {
  userIds: string[];
  select?: string;
}

export async function listProfilesByUserIds<T = unknown>(
  options: ListProfilesByUserIdsOptions,
): Promise<{ data: T[] | null; error: unknown }> {
  const { userIds, select = 'user_id, full_name, avatar_url' } = options;
  if (userIds.length === 0) return { data: [] as T[], error: null };
  const { data, error } = await supabase
    .from('profiles')
    .select(select)
    .in('user_id', userIds);
  return { data: (data as unknown as T[] | null), error };
}