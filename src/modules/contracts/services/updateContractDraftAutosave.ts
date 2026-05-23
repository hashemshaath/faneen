/**
 * CT-3 — Thin wrapper over `update_contract_draft_autosave` RPC.
 * Returns raw `{ data, error }` so the autosave hook keeps its
 * STALE_VERSION / NOT_DRAFT / FIELD_NOT_ALLOWED branching intact.
 */
import { supabase } from '@/integrations/supabase/client';

export interface UpdateContractDraftAutosaveArgs {
  _contract_id: string;
  _patch: never;
  _expected_updated_at?: string;
}

export async function updateContractDraftAutosave(args: UpdateContractDraftAutosaveArgs) {
  return await supabase.rpc('update_contract_draft_autosave', args);
}