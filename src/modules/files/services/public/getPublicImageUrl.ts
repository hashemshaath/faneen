import { supabase } from '@/integrations/supabase/client';

export interface GetPublicImageUrlParams {
  bucket: string;
  path: string;
}

/**
 * Thin wrapper around `supabase.storage.from(bucket).getPublicUrl(path)`.
 * Returns the raw Supabase result.
 */
export function getPublicImageUrl({ bucket, path }: GetPublicImageUrlParams) {
  return supabase.storage.from(bucket).getPublicUrl(path);
}