import { supabase } from '@/integrations/supabase/client';
import { uploadProviderLeadDocument } from '@/modules/files/domain/providerLeadDocuments';
import type { ProviderLeadSubmission } from '../types';

export type UpdateProviderLeadErrorCode =
  | 'invalid_input'
  | 'invalid_email'
  | 'invalid_phone'
  | 'duplicate_request'
  | 'not_found'
  | 'upload_failed'
  | 'unknown';

export interface UpdateProviderLeadResult {
  ok: boolean;
  errorCode?: UpdateProviderLeadErrorCode;
}

function mapError(message: string | undefined | null): UpdateProviderLeadErrorCode {
  if (!message) return 'unknown';
  if (message.includes('not_found_or_locked')) return 'not_found';
  if (message.includes('invalid_email')) return 'invalid_email';
  if (message.includes('invalid_phone')) return 'invalid_phone';
  if (message.includes('duplicate_request')) return 'duplicate_request';
  if (message.includes('invalid_input')) return 'invalid_input';
  return 'unknown';
}

/**
 * Public self-edit: re-validates reference + credential and updates the lead.
 * Optionally uploads a new CR file first, then calls `update_provider_lead_by_ref`.
 */
export async function updateProviderLeadByRef(
  reference: string,
  credential: string,
  patch: Partial<ProviderLeadSubmission>,
  crFile?: File | null,
): Promise<UpdateProviderLeadResult> {
  if (!reference.trim() || !credential.trim()) {
    return { ok: false, errorCode: 'invalid_input' };
  }

  const payload: Record<string, unknown> = { ...patch };

  if (crFile) {
    const token = crypto.randomUUID();
    const upload = await uploadProviderLeadDocument({ uploadToken: token, file: crFile });
    if (upload.error) return { ok: false, errorCode: 'upload_failed' };
    payload.cr_file_path = upload.path;
  }

  const { error } = await supabase.rpc('update_provider_lead_by_ref', {
    p_reference: reference.trim().toUpperCase(),
    p_credential: credential.trim(),
    payload: payload as never,
  });

  if (error) return { ok: false, errorCode: mapError(error.message) };
  return { ok: true };
}