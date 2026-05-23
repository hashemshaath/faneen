/**
 * CT-3 — Update an existing contract row by id.
 *
 * Thin pass-through over the direct table update used by the contract
 * edit/save flow. Returns the raw Supabase `{ data, error }` shape so
 * callsites keep their existing error handling exactly.
 */
import { supabase } from '@/integrations/supabase/client';

export async function updateContractById(
  contractId: string,
  payload: Record<string, unknown>,
) {
  return await supabase.from('contracts').update(payload).eq('id', contractId);
}