import { supabase } from '@/integrations/supabase/client';

/**
 * Generic admin-only "find profiles by OR of column filters" wrapper.
 *
 * Encapsulates the legacy AdminBusinesses live-owner-search query:
 *
 *   supabase.from('profiles')
 *     .select(<select>)
 *     .or(<or>)
 *     .limit(<limit>)
 *
 * Behavior preserved verbatim. Returns raw `{ data, error }`.
 */
export interface SearchProfilesByOrOptions {
  or: string;
  select: string;
  limit?: number;
}

export async function searchProfilesByOr<T = unknown>(
  options: SearchProfilesByOrOptions,
): Promise<{ data: T[] | null; error: unknown }> {
  const { or, select, limit = 8 } = options;
  const { data, error } = await supabase
    .from('profiles')
    .select(select)
    .or(or)
    .limit(limit);
  return { data: (data as unknown as T[] | null), error };
}