import { supabase } from '@/integrations/supabase/client';

/**
 * Canonical wrapper for reading the public "active categories" reference list.
 *
 * Replaces ad-hoc `supabase.from('categories').select(...).eq('is_active', true)
 * .order('sort_order')` queries that were duplicated across public pages,
 * dashboard dropdowns, and the search hook. Behavior is preserved exactly:
 *
 * - Table: `categories`
 * - Filter: `is_active = true`
 * - Order: `sort_order` ascending by default (pass `order: null` to skip)
 * - Select: caller-controlled; default `'id, name_ar, name_en'`
 * - Limit: applied only when provided
 * - Errors: returned via `{ data, error }`; never thrown. Existing callsites
 *   destructure `data` and ignore `error` — preserved verbatim.
 */
export interface ListActiveCategoriesOptions {
  select?: string;
  order?: string | null;
  limit?: number;
}

export async function listActiveCategories<T = unknown>(
  options: ListActiveCategoriesOptions = {},
): Promise<{ data: T[] | null; error: unknown }> {
  const { select = 'id, name_ar, name_en', order = 'sort_order', limit } = options;
  let query = supabase.from('categories').select(select).eq('is_active', true);
  if (order) query = query.order(order);
  if (typeof limit === 'number') query = query.limit(limit);
  const { data, error } = await query;
  return { data: (data as unknown as T[] | null), error };
}