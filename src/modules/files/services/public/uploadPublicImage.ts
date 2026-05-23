import { supabase } from '@/integrations/supabase/client';

export interface UploadPublicImageParams {
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
 * Thin wrapper around `supabase.storage.from(bucket).upload(path, file, options)`.
 * Returns the raw Supabase result. Path generation lives in callers (or
 * domain helpers). Options are forwarded verbatim — do not mutate.
 */
export function uploadPublicImage({ bucket, path, file, options }: UploadPublicImageParams) {
  return supabase.storage.from(bucket).upload(path, file, options);
}