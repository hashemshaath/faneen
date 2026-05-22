import { supabase } from '@/integrations/supabase/client';

/**
 * Canonical wrapper for the public business profile read by username.
 *
 * - Table: `businesses`
 * - Filter: `eq('username', username)`
 * - Optional: `eq('is_active', true)` when `activeOnly` is true (default true)
 * - Terminal: `maybeSingle` (default) or `single` — preserved verbatim
 * - Select: caller-controlled; default `'*'`
 * - Returns raw `{ data, error }`. Never throws by itself; bubbles thrown Supabase errors.
 */
export interface GetPublicBusinessByUsernameOptions {
  username: string;
  select?: string;
  activeOnly?: boolean;
  terminal?: 'maybeSingle' | 'single';
}

export async function getPublicBusinessByUsername<T = unknown>(
  options: GetPublicBusinessByUsernameOptions,
): Promise<{ data: T | null; error: unknown }> {
  const { username, select = '*', activeOnly = true, terminal = 'maybeSingle' } = options;
  let q = supabase.from('businesses').select(select).eq('username', username);
  if (activeOnly) q = q.eq('is_active', true);
  const { data, error } = terminal === 'single' ? await q.single() : await q.maybeSingle();
  return { data: (data as unknown as T | null), error };
}