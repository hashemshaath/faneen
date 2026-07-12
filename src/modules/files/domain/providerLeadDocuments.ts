import { supabase } from '@/integrations/supabase/client';
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
 * `provider-lead-documents` bucket via the `upload-provider-lead-doc`
 * edge function (service role). The public storage RLS INSERT path was
 * removed so anonymous clients can no longer write directly — the edge
 * function validates size/mime server-side and picks the folder token.
 * `uploadToken` is retained in the API for backwards compatibility but
 * is no longer used (server chooses the folder to prevent path spoofing).
 */
export async function uploadProviderLeadDocument({
  uploadToken: _uploadToken,
  file,
}: UploadProviderLeadDocumentParams): Promise<UploadProviderLeadDocumentResult> {
  if (file.size > PROVIDER_LEAD_DOC_MAX_BYTES) {
    return { path: '', error: new Error('file_too_large') };
  }
  if (!PROVIDER_LEAD_DOC_MIMES.includes(file.type as typeof PROVIDER_LEAD_DOC_MIMES[number])) {
    return { path: '', error: new Error('unsupported_type') };
  }
  try {
    const form = new FormData();
    form.append('file', file, file.name);
    const { data, error } = await supabase.functions.invoke('upload-provider-lead-doc', {
      body: form,
    });
    if (error) {
      return { path: '', error: error instanceof Error ? error : new Error('upload_failed') };
    }
    const path = (data as { path?: string } | null)?.path;
    if (!path) return { path: '', error: new Error('upload_failed') };
    return { path, error: null };
  } catch (e) {
    return { path: '', error: e instanceof Error ? e : new Error('upload_failed') };
  }
}

/** 10-minute signed URL for admin preview. */
export function createProviderLeadDocumentSignedUrl(path: string) {
  return createPrivateSignedUrl({
    bucket: PROVIDER_LEAD_DOCUMENTS_BUCKET,
    path,
    expiresIn: 600,
  });
}