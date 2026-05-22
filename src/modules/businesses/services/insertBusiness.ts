import { supabase } from '@/integrations/supabase/client';

/**
 * Canonical wrapper for `supabase.from('businesses').insert(payload)`.
 *
 * - Table: `businesses`
 * - Payload: passed through unchanged (no transformation, no normalization)
 * - Terminal modes:
 *   - `'none'` (default): no `.select()`, no `.single()`/`.maybeSingle()`
 *   - `'maybeSingle'`: requires `select`; calls `.select(select).maybeSingle()`
 *   - `'single'`: requires `select`; calls `.select(select).single()`
 * - Returns the raw Supabase `{ data, error }`; does not throw on its own.
 * - Does NOT catch duplicate errors; does NOT implement race recovery.
 *   Callers retain exact duplicate/race behavior.
 */
export interface InsertBusinessOptions {
  payload: Record<string, unknown>;
  select?: string;
  terminal?: 'none' | 'maybeSingle' | 'single';
}

export async function insertBusiness(
  options: InsertBusinessOptions,
): Promise<{ data: unknown; error: unknown }> {
  const { payload, select, terminal = 'none' } = options;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const base: any = supabase.from('businesses').insert(payload as any);

  if (terminal === 'none' || !select) {
    const { data, error } = await base;
    return { data, error };
  }

  if (terminal === 'single') {
    const { data, error } = await base.select(select).single();
    return { data, error };
  }

  // maybeSingle
  const { data, error } = await base.select(select).maybeSingle();
  return { data, error };
}