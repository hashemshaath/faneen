import { supabase } from '@/integrations/supabase/client';

/**
 * R4B — Canonical wrapper for the admin provider analytics top-providers detail lookup.
 *
 * Source callsite: src/pages/admin/AdminProviderAnalytics.tsx
 *
 * Verbatim semantics:
 *  - Table: `businesses_public` (no PII; logo, name, rating, tier, verified only)
 *  - Select: id, name_ar, name_en, username, logo_url, rating_avg, rating_count,
 *            membership_tier, is_verified
 *  - Filter: id IN (<ids>)
 *  - Returns: `data ?? []`
 */
const SELECT =
  'id, name_ar, name_en, username, logo_url, rating_avg, rating_count, membership_tier, is_verified';

export async function listPublicProvidersForAnalytics<T = unknown>(
  ids: string[],
): Promise<T[]> {
  if (!ids.length) return [];
  const { data } = await supabase
    .from('businesses_public')
    .select(SELECT)
    .in('id', ids);
  return (data ?? []) as unknown as T[];
}