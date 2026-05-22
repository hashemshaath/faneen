import { supabase } from '@/integrations/supabase/client';

/**
 * Canonical wrapper for admin single-row business reads by id.
 *
 * - Table: `businesses`
 * - Filter: `eq('id', id)`
 * - Terminal: `maybeSingle` (default) or `single` — preserved verbatim.
 * - Select: caller-controlled; default `'*'`.
 * - Returns raw `{ data, error }`. Never throws by itself; bubbles thrown Supabase errors.
 */
export interface GetAdminBusinessByIdOptions {
  id: string;
  select?: string;
  terminal?: 'maybeSingle' | 'single';
}

export async function getAdminBusinessById<T = unknown>(
  options: GetAdminBusinessByIdOptions,
): Promise<{ data: T | null; error: unknown }> {
  const { id, select = '*', terminal = 'maybeSingle' } = options;
  const base = supabase.from('businesses').select(select).eq('id', id);
  const { data, error } =
    terminal === 'single' ? await base.single() : await base.maybeSingle();
  return { data: (data as unknown as T | null), error };
}