import { supabase } from '@/integrations/supabase/client';
import { compressImage } from '@/lib/image-compress';

/**
 * Upload a single quote-request attachment to the `quote-request-files`
 * storage bucket (A2). Preserves the exact bucket name, path, and upload
 * options used in Quote.tsx. Throws on storage error so the caller can
 * decide whether to swallow (Quote.tsx currently console.warns and skips
 * the DB insert for that file).
 */
export interface UploadQuoteRequestFileParams {
  path: string;
  file: File;
}

export async function uploadQuoteRequestFile({
  path,
  file,
}: UploadQuoteRequestFileParams): Promise<{ path: string }> {
  // Auto-compress image attachments before upload (no-op for non-images).
  const toUpload = (file.type || '').startsWith('image/')
    ? await compressImage(file)
    : file;
  const { error } = await supabase.storage
    .from('quote-request-files')
    .upload(path, toUpload, { upsert: false, contentType: toUpload.type || undefined });
  if (error) throw error;
  return { path };
}