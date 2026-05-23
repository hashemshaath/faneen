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
  // Cast at the boundary: callsites build payloads dynamically and the
  // existing direct-update code did not constrain to the generated Update type.
  return await supabase.from('contracts').update(payload as never).eq('id', contractId);
}