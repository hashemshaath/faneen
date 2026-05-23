import { supabase } from '@/integrations/supabase/client';

/**
 * R4B — Canonical wrapper for the public Categories page provider grid.
 *
 * Source callsite: src/pages/Categories.tsx
 *
 * Verbatim semantics:
 *  - Table: `businesses_public` (enforces is_active=true, approval_status='published', is_demo=false)
 *  - Select: id, username, name_ar, name_en, logo_url, rating_avg, rating_count,
 *            is_verified, city_id, cities(name_ar, name_en)
 *  - Filter: category_id = <categoryId>
 *  - Order:  rating_avg DESC
 *  - Limit:  50 (override via `limit`)
 *  - Returns: `data ?? []`
 */
const SELECT =
  'id, username, name_ar, name_en, logo_url, rating_avg, rating_count, is_verified, city_id, cities(name_ar, name_en)';

export interface ListPublicBusinessesByCategoryOptions {
  limit?: number;
}

export async function listPublicBusinessesByCategory<T = unknown>(
  categoryId: string,
  options: ListPublicBusinessesByCategoryOptions = {},
): Promise<T[]> {
  const { limit = 50 } = options;
  const { data } = await supabase
    .from('businesses_public')
    .select(SELECT)
    .eq('category_id', categoryId)
    .order('rating_avg', { ascending: false })
    .limit(limit);
  return (data ?? []) as unknown as T[];
}