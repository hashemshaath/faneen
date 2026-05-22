import { supabase } from '@/integrations/supabase/client';

/**
 * Canonical wrapper for owner multi-business list reads:
 *
 *   supabase.from('businesses')
 *     .select(<select>)
 *     .eq('user_id', userId)
 *     [.eq('is_active', true)?]
 *     [.order(...)?]
 *     [.limit(n)?]
 *
 * Returns the raw `{ data, error }` shape (data is array | null).
 * Never throws; never transforms the payload. Used by the dashboard's
 * multi-business pickers and the membership owner-fallback.
 */
export interface ListOwnerBusinessesOptions {
  userId: string;
  select?: string;
  activeOnly?: boolean;
  orderBy?: { column: string; ascending?: boolean };
  limit?: number;
}

export async function listOwnerBusinesses<T = unknown>(
  options: ListOwnerBusinessesOptions,
): Promise<{ data: T[] | null; error: unknown }> {
  const { userId, select = 'id', activeOnly, orderBy, limit } = options;
  let query = supabase.from('businesses').select(select).eq('user_id', userId);
  if (activeOnly) query = query.eq('is_active', true);
  if (orderBy) query = query.order(orderBy.column, { ascending: orderBy.ascending ?? true });
  if (typeof limit === 'number') query = query.limit(limit);
  const { data, error } = await query;
  return { data: (data as unknown as T[] | null), error };
}