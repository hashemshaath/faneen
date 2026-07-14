import { supabase } from '@/integrations/supabase/client';

/**
 * R4B — Canonical wrapper for the home "Top Providers" section.
 *
 * M4.2 SEMANTICS (tier-driven visibility, non-hiding):
 *   Providers whose active plan has `limits.homepage_visibility = true` are
 *   PREFERRED (ordered first) in the widget. Providers on tiers without the
 *   flag are NOT hidden — they fill remaining slots when there aren't enough
 *   preferred providers to satisfy `limit`. This keeps the marketplace open
 *   (free providers still appear in the general directory/search) while
 *   letting paid tiers earn the premium homepage placement they were sold.
 *
 *   The tier → homepage_visibility mapping is read once from
 *   `membership_plans.limits` so tuning it in the admin plan editor
 *   automatically updates ranking here — no code deploy required.
 *
 * Verbatim base semantics (unchanged):
 *  - Table: `businesses_public`
 *  - Filters: is_active = true AND rating_count > 0
 *  - Base order: rating_avg DESC
 *  - Default limit: 8
 *  - Returns: `data ?? []` (never throws)
 */
const SELECT =
  'id, username, name_ar, name_en, logo_url, rating_avg, rating_count, membership_tier, is_verified, cities(name_ar, name_en)';

export interface ListTopPublicProvidersOptions {
  limit?: number;
  /** When true (default), tier-based homepage visibility ordering is applied. */
  preferHomepageVisibility?: boolean;
}

type ProviderRow = { membership_tier?: string | null } & Record<string, unknown>;

async function loadHomepageVisibleTiers(): Promise<Set<string>> {
  const { data } = await supabase
    .from('membership_plans')
    .select('tier, limits')
    .eq('is_active', true);
  const set = new Set<string>();
  for (const row of (data ?? []) as Array<{ tier: string; limits: Record<string, unknown> | null }>) {
    if (row.limits && (row.limits as Record<string, unknown>).homepage_visibility === true) {
      set.add(row.tier);
    }
  }
  return set;
}

export async function listTopPublicProviders<T = unknown>(
  options: ListTopPublicProvidersOptions = {},
): Promise<T[]> {
  const { limit = 8, preferHomepageVisibility = true } = options;
  // Fetch a wider pool so the preference reorder still has fallbacks to fill
  // `limit` slots when the preferred tier is thin.
  const fetchLimit = preferHomepageVisibility ? Math.max(limit * 3, limit + 8) : limit;
  const { data } = await supabase
    .from('businesses_public')
    .select(SELECT)
    .eq('is_active', true)
    .gt('rating_count', 0)
    .order('rating_avg', { ascending: false })
    .limit(fetchLimit);
  const rows = (data ?? []) as ProviderRow[];
  if (!preferHomepageVisibility) return rows.slice(0, limit) as unknown as T[];

  const visibleTiers = await loadHomepageVisibleTiers();
  const preferred: ProviderRow[] = [];
  const rest: ProviderRow[] = [];
  for (const r of rows) {
    if (r.membership_tier && visibleTiers.has(String(r.membership_tier))) preferred.push(r);
    else rest.push(r);
  }
  return preferred.concat(rest).slice(0, limit) as unknown as T[];
}