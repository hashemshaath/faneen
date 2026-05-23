import { uploadPrivateDocument } from '../services/private/uploadPrivateDocument';
import { createPrivateSignedUrl } from '../services/private/createPrivateSignedUrl';
import { BUSINESS_DOCUMENTS_BUCKET } from '../constants/buckets';

/** 1 year in seconds — preserved verbatim from the legacy CrDocumentScanner. */
export const CR_DOCUMENT_SIGNED_URL_TTL_SECONDS = 60 * 60 * 24 * 365;

export interface UploadCrDocumentParams {
  businessId: string;
  file: File;
}

export interface UploadCrDocumentResult {
  path: string;
  error: Error | null;
}

/**
 * CR document upload helper. Preserves the exact path + options used
 * previously in `CrDocumentScanner.tsx`:
 *
 *   ext:     `file.name.includes('.') ? file.name.split('.').pop() : 'bin'`
 *   path:    `cr/${businessId}/${Date.now()}-${crypto.randomUUID()}.${ext}`
 *   bucket:  business-documents
 *   options: { upsert: false, contentType: file.type || undefined }
 */
export async function uploadCrDocument({
  businessId,
  file,
}: UploadCrDocumentParams): Promise<UploadCrDocumentResult> {
  const ext = file.name.includes('.') ? file.name.split('.').pop() : 'bin';
  const path = `cr/${businessId}/${Date.now()}-${crypto.randomUUID()}.${ext}`;
  const { error } = await uploadPrivateDocument({
    bucket: BUSINESS_DOCUMENTS_BUCKET,
    path,
    file,
    options: { upsert: false, contentType: file.type || undefined },
  });
  return { path, error: (error as Error | null) ?? null };
}

/**
 * Create a signed URL for a CR document with the canonical 1-year TTL
 * preserved from the legacy callsite.
 */
export function createCrDocumentSignedUrl(path: string) {
  return createPrivateSignedUrl({
    bucket: BUSINESS_DOCUMENTS_BUCKET,
    path,
    expiresIn: CR_DOCUMENT_SIGNED_URL_TTL_SECONDS,
  });
}