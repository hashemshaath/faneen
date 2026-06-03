import { uploadPrivateDocument } from '../services/private/uploadPrivateDocument';
import { createPrivateSignedUrl } from '../services/private/createPrivateSignedUrl';
import { PROVIDER_LEAD_DOCUMENTS_BUCKET } from '../constants/buckets';

/** Allowed MIME types for provider-lead CR uploads. */
export const PROVIDER_LEAD_DOC_MIMES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
] as const;

/** Hard size cap (5 MB). */
export const PROVIDER_LEAD_DOC_MAX_BYTES = 5 * 1024 * 1024;

export interface UploadProviderLeadDocumentParams {
  /** Stable client-side token (uuid) used to namespace the upload before a reference code exists. */
  uploadToken: string;
  file: File;
}

export interface UploadProviderLeadDocumentResult {
  path: string;
  error: Error | null;
}

/**
 * Upload a CR file from the public join form into the private
 * `provider-lead-documents` bucket. RLS only allows INSERT under
 * `prv-leads/`; admins are the only readers.
 */
export async function uploadProviderLeadDocument({
  uploadToken,
  file,
}: UploadProviderLeadDocumentParams): Promise<UploadProviderLeadDocumentResult> {
  if (file.size > PROVIDER_LEAD_DOC_MAX_BYTES) {
    return { path: '', error: new Error('file_too_large') };
  }
  if (!PROVIDER_LEAD_DOC_MIMES.includes(file.type as typeof PROVIDER_LEAD_DOC_MIMES[number])) {
    return { path: '', error: new Error('unsupported_type') };
  }
  const ext = file.name.includes('.') ? file.name.split('.').pop() : 'bin';
  const safeExt = (ext ?? 'bin').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 8) || 'bin';
  const path = `prv-leads/${uploadToken}/cr-${Date.now()}.${safeExt}`;
  const { error } = await uploadPrivateDocument({
    bucket: PROVIDER_LEAD_DOCUMENTS_BUCKET,
    path,
    file,
    options: { upsert: false, contentType: file.type || undefined },
  });
  return { path, error: (error as Error | null) ?? null };
}

/** 10-minute signed URL for admin preview. */
export function createProviderLeadDocumentSignedUrl(path: string) {
  return createPrivateSignedUrl({
    bucket: PROVIDER_LEAD_DOCUMENTS_BUCKET,
    path,
    expiresIn: 600,
  });
}