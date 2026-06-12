import { supabase } from '@/integrations/supabase/client';

export interface RemovePublicImagesParams {
  bucket: string;
  paths: string[];
}

/**
 * Thin wrapper around `supabase.storage.from(bucket).remove(paths)` for
 * batch removal of public images. Returns the raw Supabase result.
 * Path/bucket semantics preserved verbatim.
 */
export function removePublicImages({ bucket, paths }: RemovePublicImagesParams) {
  return supabase.storage.from(bucket).remove(paths);
}