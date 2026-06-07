import { supabase } from '@/integrations/supabase/client';

/**
 * R4B — Canonical wrapper for the public Categories page provider grid.
 *
 * Source callsite: src/pages/Categories.tsx
 *
 * Phase 18i: legacy `businesses.category_id` column dropped. Categorization
 * now resolves through `business_taxonomy_categories` (taxonomy_categories.id).
 *
 * Verbatim semantics:
 *  - Source: `businesses_public` (enforces is_active=true,
 *            approval_status='published', is_demo=false)
 *  - Select: id, username, name_ar, name_en, logo_url, rating_avg,
 *            rating_count, is_verified, city_id, cities(name_ar, name_en)
 *  - Filter: businesses linked to <categoryId> via business_taxonomy_categories
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
  // Step 1 — resolve business_ids linked to this taxonomy category.
  const { data: links } = await supabase
    .from('business_taxonomy_categories')
    .select('business_id')
    .eq('category_id', categoryId);
  const businessIds = Array.from(
    new Set((links ?? []).map((l) => l.business_id as string).filter(Boolean)),
  );
  if (businessIds.length === 0) return [];
  // Step 2 — read the public projection so demo/draft/unpublished
  // providers are naturally excluded.
  const { data } = await supabase
    .from('businesses_public')
    .select(SELECT)
    .in('id', businessIds)
    .order('rating_avg', { ascending: false })
    .limit(limit);
  return (data ?? []) as unknown as T[];
}