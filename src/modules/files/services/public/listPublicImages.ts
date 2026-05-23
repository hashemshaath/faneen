import { supabase } from '@/integrations/supabase/client';

export interface ListPublicImagesOptions {
  limit?: number;
  offset?: number;
  sortBy?: { column: string; order: 'asc' | 'desc' };
  search?: string;
}

export interface ListPublicImagesParams {
  bucket: string;
  path: string;
  options?: ListPublicImagesOptions;
}

/**
 * Thin wrapper around `supabase.storage.from(bucket).list(path, options)`.
 * Returns the raw Supabase result. Path + options forwarded verbatim.
 */
export function listPublicImages({ bucket, path, options }: ListPublicImagesParams) {
  return supabase.storage.from(bucket).list(path, options);
}