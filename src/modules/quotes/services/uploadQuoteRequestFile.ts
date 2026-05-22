import { supabase } from '@/integrations/supabase/client';

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
  const { error } = await supabase.storage
    .from('quote-request-files')
    .upload(path, file, { upsert: false, contentType: file.type || undefined });
  if (error) throw error;
  return { path };
}