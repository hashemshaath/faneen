import { supabase } from '@/integrations/supabase/client';

/**
 * REGISTRATION-UX-FULL-COMPLETE-1 Part 2
 * Canonical wrapper for `supabase.from('business_branches').insert(payload)`.
 *
 * - Payload passed through unchanged (no transformation).
 * - The DB column `ref_id` has a `generate_ref_id('LOC','seq_loc')` default,
 *   so callers do not need to send one.
 * - Returns the inserted row (id + ref_id) when `terminal === 'single'`.
 */
export interface InsertBusinessBranchOptions {
  payload: Record<string, unknown>;
  select?: string;
  terminal?: 'none' | 'single' | 'maybeSingle';
}

export async function insertBusinessBranch(
  options: InsertBusinessBranchOptions,
): Promise<{ data: unknown; error: unknown }> {
  const { payload, select, terminal = 'none' } = options;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const base: any = supabase.from('business_branches').insert(payload as any);

  if (terminal === 'none' || !select) {
    const { data, error } = await base;
    return { data, error };
  }
  if (terminal === 'single') {
    const { data, error } = await base.select(select).single();
    return { data, error };
  }
  const { data, error } = await base.select(select).maybeSingle();
  return { data, error };
}