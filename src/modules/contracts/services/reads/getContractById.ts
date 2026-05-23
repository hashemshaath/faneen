/**
 * CT-2 — Single-contract read by id.
 * Pass-through raw `{ data, error }`. Caller controls select shape and
 * single/maybeSingle terminal.
 */
import { supabase } from '@/integrations/supabase/client';

export interface GetContractByIdArgs {
  id: string;
  /** Defaults to '*' to preserve historical callsite default. */
  select?: string;
  /** Terminal method. Defaults to 'maybeSingle' (current ContractDetail behavior). */
  terminal?: 'single' | 'maybeSingle';
}

export async function getContractById(args: GetContractByIdArgs) {
  const { id, select = '*', terminal = 'maybeSingle' } = args;
  const q = supabase.from('contracts').select(select).eq('id', id);
  return terminal === 'single' ? q.single() : q.maybeSingle();
}
