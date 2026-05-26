import { supabase } from '@/integrations/supabase/client';

/**
 * Wrapper for `supabase.from('profiles').select(...).eq('ref_id', refId).{maybeSingle|single}()`.
 *
 * - Table: `profiles`
 * - Filter: `ref_id = refId`
 * - Terminal: `maybeSingle` (default) or `single`
 * - Select: caller-controlled; default `'*'`
 * - Returns raw `{ data, error }`; never throws.
 */
export interface GetProfileByRefIdOptions {
  refId: string;
  select?: string;
  terminal?: 'single' | 'maybeSingle';
}

export async function getProfileByRefId<T = unknown>(
  options: GetProfileByRefIdOptions,
): Promise<{ data: T | null; error: unknown }> {
  const { refId, select = '*', terminal = 'maybeSingle' } = options;
  const query = supabase.from('profiles').select(select).eq('ref_id', refId);
  const { data, error } =
    terminal === 'single' ? await query.single() : await query.maybeSingle();
  return { data: (data as unknown as T | null), error };
}