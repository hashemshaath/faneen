import { supabase } from '@/integrations/supabase/client';

export interface CreatePrivateSignedUrlParams {
  bucket: string;
  path: string;
  expiresIn: number;
}

/**
 * Thin wrapper around `supabase.storage.from(bucket).createSignedUrl(path, expiresIn)`.
 * `expiresIn` is in seconds. Returns the raw Supabase result.
 */
export function createPrivateSignedUrl({ bucket, path, expiresIn }: CreatePrivateSignedUrlParams) {
  return supabase.storage.from(bucket).createSignedUrl(path, expiresIn);
}