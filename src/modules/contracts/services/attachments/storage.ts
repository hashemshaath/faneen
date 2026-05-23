/**
 * CT-7 — Contract runtime attachment storage wrappers.
 * Thin pass-through wrappers around the `contract-attachments` bucket.
 * Returns raw Supabase storage `{ data, error }` shapes (or sync
 * `{ data }` for `getPublicUrl`) to preserve existing callsite logic.
 */
import { supabase } from '@/integrations/supabase/client';
import { CONTRACT_ATTACHMENTS_BUCKET } from './constants';

export interface ContractAttachmentUploadOptions {
  contentType?: string;
  cacheControl?: string;
  upsert?: boolean;
}

export async function uploadContractAttachmentFile(
  path: string,
  file: File | Blob,
  options?: ContractAttachmentUploadOptions,
) {
  if (options === undefined) {
    return await supabase.storage
      .from(CONTRACT_ATTACHMENTS_BUCKET)
      .upload(path, file);
  }
  return await supabase.storage
    .from(CONTRACT_ATTACHMENTS_BUCKET)
    .upload(path, file, options);
}

export function getContractAttachmentPublicUrl(path: string) {
  return supabase.storage
    .from(CONTRACT_ATTACHMENTS_BUCKET)
    .getPublicUrl(path);
}

export async function removeContractAttachmentFiles(paths: string[]) {
  return await supabase.storage
    .from(CONTRACT_ATTACHMENTS_BUCKET)
    .remove(paths);
}

export async function createSignedContractAttachmentUrl(
  path: string,
  expiresInSec: number,
) {
  return await supabase.storage
    .from(CONTRACT_ATTACHMENTS_BUCKET)
    .createSignedUrl(path, expiresInSec);
}