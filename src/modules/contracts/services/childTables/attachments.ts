/**
 * CT-4 — Contract attachments child-table service wrappers.
 * Only the `contract_attachments` TABLE is wrapped here. Storage bucket
 * access is intentionally out of CT-4 scope (deferred to CT-6).
 */
import { supabase } from '@/integrations/supabase/client';

export async function listContractAttachments(contractId: string) {
  return await supabase
    .from('contract_attachments')
    .select('*')
    .eq('contract_id', contractId)
    .order('created_at', { ascending: false });
}

export async function createContractAttachment(payload: Record<string, unknown>) {
  return await supabase.from('contract_attachments').insert(payload as never);
}

export async function deleteContractAttachmentById(attachmentId: string) {
  return await supabase.from('contract_attachments').delete().eq('id', attachmentId);
}