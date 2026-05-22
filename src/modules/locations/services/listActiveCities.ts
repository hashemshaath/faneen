import { supabase } from '@/integrations/supabase/client';

/**
 * Canonical wrapper for the public "active cities" reference list.
 *
 * - Table: `cities`
 * - Filter: `is_active = true`
 * - Order: `name_ar` ascending by default (pass `order: null` to skip — some
 *   callsites such as `HeroSection`, `Projects`, and `AdminBusinesses` did
 *   not specify an order; passing `null` preserves their exact behavior).
 * - Select: caller-controlled; default `'id, name_ar, name_en'`
 * - Limit: applied only when provided
 * - Errors: returned via `{ data, error }`; never thrown.
 */
export interface ListActiveCitiesOptions {
  select?: string;
  order?: string | null;
  limit?: number;
}

export async function listActiveCities<T = unknown>(
  options: ListActiveCitiesOptions = {},
): Promise<{ data: T[] | null; error: unknown }> {
  const { select = 'id, name_ar, name_en', order = 'name_ar', limit } = options;
  let query = supabase.from('cities').select(select).eq('is_active', true);
  if (order) query = query.order(order);
  if (typeof limit === 'number') query = query.limit(limit);
  const { data, error } = await query;
  return { data: (data as unknown as T[] | null), error };
}