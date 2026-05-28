/**
 * CT-3 — Update an existing contract row by id.
 *
 * Thin pass-through over the direct table update used by the contract
 * edit/save flow. Returns the raw Supabase `{ data, error }` shape so
 * callsites keep their existing error handling exactly.
 */
import { supabase } from '@/integrations/supabase/client';
import { emitContractAudit, readContractStatusSafe } from './emitContractAudit';

export async function updateContractById(
  contractId: string,
  payload: Record<string, unknown>,
) {
  // Cast at the boundary: callsites build payloads dynamically and the
  // existing direct-update code did not constrain to the generated Update type.
  const includesStatus =
    payload && Object.prototype.hasOwnProperty.call(payload, 'status');
  const previousStatus = includesStatus
    ? await readContractStatusSafe(contractId)
    : null;
  const res = await supabase
    .from('contracts')
    .update(payload as never)
    .eq('id', contractId);
  // BUSINESS-CORE-14 — best-effort source-side audit for the Unified Operations Feed.
  if (!res.error) {
    if (includesStatus) {
      const nextStatus =
        typeof (payload as Record<string, unknown>).status === 'string'
          ? ((payload as Record<string, unknown>).status as string)
          : null;
      await emitContractAudit({
        contractId,
        action: 'contract.status_changed',
        previousStatus,
        newStatus: nextStatus,
      });
    } else {
      await emitContractAudit({
        contractId,
        action: 'contract.updated',
      });
    }
  }
  return res;
}