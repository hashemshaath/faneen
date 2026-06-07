import { supabase } from '@/integrations/supabase/client';

/**
 * R4B — Canonical wrapper for the home "Top Providers" section.
 *
 * Source callsite: src/components/home/TopProvidersSection.tsx (deleted in
 * the home cleanup — wrapper retained as a public read primitive).
 *
 * Phase 16: the legacy `categories(...)` join + `category_id` column have
 * been dropped from the default SELECT. Callers needing a category label
 * should resolve it via `getPrimaryTaxonomyLabelsForBusinesses` from the
 * taxonomy module.
 *
 * Verbatim semantics:
 *  - Table: `businesses_public`
 *  - Filters: is_active = true AND rating_count > 0
 *  - Order:   rating_avg DESC
 *  - Limit:   8 (override via `limit`)
 *  - Returns: `data ?? []` (never throws)
 */
const SELECT =
  'id, username, name_ar, name_en, logo_url, rating_avg, rating_count, membership_tier, is_verified, cities(name_ar, name_en)';

export interface ListTopPublicProvidersOptions {
  limit?: number;
}

export async function listTopPublicProviders<T = unknown>(
  options: ListTopPublicProvidersOptions = {},
): Promise<T[]> {
  const { limit = 8 } = options;
  const { data } = await supabase
    .from('businesses_public')
    .select(SELECT)
    .eq('is_active', true)
    .gt('rating_count', 0)
    .order('rating_avg', { ascending: false })
    .limit(limit);
  return (data ?? []) as unknown as T[];
}