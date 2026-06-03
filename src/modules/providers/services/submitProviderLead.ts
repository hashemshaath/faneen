import { supabase } from '@/integrations/supabase/client';
import { uploadProviderLeadDocument } from '@/modules/files/domain/providerLeadDocuments';
import { sendTransactionalEmail } from '@/modules/notifications/services/sendTransactionalEmail';
import type {
  ProviderLeadSubmission,
  ProviderLeadSubmissionResult,
} from '../types';

export type SubmitProviderLeadErrorCode =
  | 'invalid_email'
  | 'invalid_phone'
  | 'duplicate_request'
  | 'rate_limited'
  | 'upload_failed'
  | 'unknown';

export interface SubmitProviderLeadResult {
  ok: boolean;
  data?: ProviderLeadSubmissionResult;
  errorCode?: SubmitProviderLeadErrorCode;
}

function mapErrorMessage(message: string | undefined | null): SubmitProviderLeadErrorCode {
  if (!message) return 'unknown';
  if (message.includes('invalid_email')) return 'invalid_email';
  if (message.includes('invalid_phone')) return 'invalid_phone';
  if (message.includes('duplicate_request')) return 'duplicate_request';
  if (message.includes('rate_limited')) return 'rate_limited';
  return 'unknown';
}

async function hashIpFingerprint(): Promise<string> {
  // Privacy-safe fingerprint: hash of UA + screen + tz; not actual IP.
  try {
    const seed = [
      navigator.userAgent,
      `${window.screen?.width}x${window.screen?.height}`,
      Intl.DateTimeFormat().resolvedOptions().timeZone,
    ].join('|');
    const buf = new TextEncoder().encode(seed);
    const digest = await crypto.subtle.digest('SHA-256', buf);
    return Array.from(new Uint8Array(digest))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  } catch {
    return '';
  }
}

/**
 * Public provider-lead intake. Optionally uploads the CR file first,
 * then invokes the SECURITY DEFINER RPC `submit_provider_lead`.
 */
export async function submitProviderLead(
  input: ProviderLeadSubmission,
  crFile?: File | null,
): Promise<SubmitProviderLeadResult> {
  let crFilePath: string | undefined;
  if (crFile) {
    const token = crypto.randomUUID();
    const upload = await uploadProviderLeadDocument({ uploadToken: token, file: crFile });
    if (upload.error) {
      return { ok: false, errorCode: 'upload_failed' };
    }
    crFilePath = upload.path;
  }

  const ipHash = await hashIpFingerprint();
  const payload = {
    ...input,
    cr_file_path: crFilePath,
    ip_hash: ipHash,
    user_agent: typeof navigator !== 'undefined' ? navigator.userAgent.slice(0, 500) : undefined,
  };

  const { data, error } = await supabase.rpc('submit_provider_lead', { payload });

  if (error) {
    return { ok: false, errorCode: mapErrorMessage(error.message) };
  }

  const result = data as ProviderLeadSubmissionResult | null;
  if (!result?.reference_code) {
    return { ok: false, errorCode: 'unknown' };
  }

  // Best-effort confirmation email — never block UX on it.
  try {
    await sendTransactionalEmail({
      templateName: 'provider-lead-confirmation',
      recipientEmail: input.email,
      idempotencyKey: `provider-lead-${result.reference_code}`,
      templateData: {
        nameAr: input.name_ar,
        nameEn: input.name_en ?? input.name_ar,
        contactName: input.contact_name,
        referenceCode: result.reference_code,
      },
    });
  } catch {
    /* swallow — confirmation is non-blocking */
  }

  return { ok: true, data: result };
}