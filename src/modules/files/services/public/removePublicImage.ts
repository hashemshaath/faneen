import { supabase } from '@/integrations/supabase/client';

export interface RemovePublicImageParams {
  bucket: string;
  path: string;
}

/**
 * Thin wrapper around `supabase.storage.from(bucket).remove([path])`.
 * Returns the raw Supabase result.
 */
export function removePublicImage({ bucket, path }: RemovePublicImageParams) {
  return supabase.storage.from(bucket).remove([path]);
}