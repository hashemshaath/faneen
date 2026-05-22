import { supabase } from '@/integrations/supabase/client';

/**
 * Canonical wrapper for single-row business reads by ref_id (e.g. BIZ-…).
 *
 * - Table: `businesses`
 * - Filter: `eq('ref_id', refId)`
 * - Terminal: `maybeSingle` (default) or `single` — preserved verbatim
 * - Select: caller-controlled; default `'id'`
 * - Returns raw `{ data, error }`. Never throws by itself; bubbles thrown Supabase errors.
 */
export interface GetBusinessByRefIdOptions {
  refId: string;
  select?: string;
  terminal?: 'maybeSingle' | 'single';
}

export async function getBusinessByRefId<T = unknown>(
  options: GetBusinessByRefIdOptions,
): Promise<{ data: T | null; error: unknown }> {
  const { refId, select = 'id', terminal = 'maybeSingle' } = options;
  const base = supabase.from('businesses').select(select).eq('ref_id', refId);
  const { data, error } = terminal === 'single' ? await base.single() : await base.maybeSingle();
  return { data: (data as unknown as T | null), error };
}