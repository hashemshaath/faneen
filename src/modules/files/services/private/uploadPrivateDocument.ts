import { supabase } from '@/integrations/supabase/client';

export interface UploadPrivateDocumentParams {
  bucket: string;
  path: string;
  file: File | Blob;
  options?: {
    cacheControl?: string;
    upsert?: boolean;
    contentType?: string;
  };
}

/**
 * Thin wrapper around `supabase.storage.from(bucket).upload(path, file, options)`
 * for private (non-public) buckets. Options forwarded verbatim — do not mutate.
 */
export function uploadPrivateDocument({ bucket, path, file, options }: UploadPrivateDocumentParams) {
  return supabase.storage.from(bucket).upload(path, file, options);
}