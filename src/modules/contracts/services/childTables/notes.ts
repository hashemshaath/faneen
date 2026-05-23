/**
 * CT-4 — Contract notes child-table service wrappers.
 */
import { supabase } from '@/integrations/supabase/client';

export async function listContractNotes(contractId: string) {
  return await supabase
    .from('contract_notes')
    .select('*')
    .eq('contract_id', contractId)
    .order('created_at', { ascending: false });
}

export async function createContractNote(payload: Record<string, unknown>) {
  return await supabase.from('contract_notes').insert(payload as never);
}

export async function deleteContractNote(noteId: string) {
  return await supabase.from('contract_notes').delete().eq('id', noteId);
}