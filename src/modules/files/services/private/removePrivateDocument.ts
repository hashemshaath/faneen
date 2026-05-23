import { supabase } from '@/integrations/supabase/client';

export interface RemovePrivateDocumentParams {
  bucket: string;
  paths: string[];
}

/**
 * Thin wrapper around `supabase.storage.from(bucket).remove(paths)`.
 */
export function removePrivateDocument({ bucket, paths }: RemovePrivateDocumentParams) {
  return supabase.storage.from(bucket).remove(paths);
}