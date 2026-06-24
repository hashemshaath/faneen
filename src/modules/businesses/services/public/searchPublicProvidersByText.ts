import { supabase } from '@/integrations/supabase/client';

/**
 * Contract create flow — search providers (businesses) by free-text.
 * Reads the masked `businesses_public` view (RLS-safe; never exposes PII).
 * No RPC, no edge calls. Returns up to `limit` rows ordered by rating.
 */
export interface PublicProviderSearchRow {
  id: string;
  username: string | null;
  ref_id: string | null;
  name_ar: string | null;
  name_en: string | null;
  logo_url: string | null;
  rating_avg: number | null;
  rating_count: number | null;
  is_verified: boolean | null;
}

const SELECT =
  'id, username, ref_id, name_ar, name_en, logo_url, rating_avg, rating_count, is_verified';

export interface SearchPublicProvidersOptions {
  query: string;
  limit?: number;
}

export async function searchPublicProvidersByText(
  options: SearchPublicProvidersOptions,
): Promise<PublicProviderSearchRow[]> {
  const query = (options.query ?? '').trim();
  const limit = options.limit ?? 8;
  if (query.length < 2) return [];
  const escaped = query.replace(/[%,()]/g, ' ');
  const pattern = `%${escaped}%`;
  const filter = [
    `name_ar.ilike.${pattern}`,
    `name_en.ilike.${pattern}`,
    `username.ilike.${pattern}`,
    `ref_id.ilike.${pattern}`,
  ].join(',');
  const { data, error } = await supabase
    .from('businesses_public')
    .select(SELECT)
    .eq('is_active', true)
    .or(filter)
    .order('rating_avg', { ascending: false, nullsFirst: false })
    .limit(limit);
  if (error) return [];
  return (data ?? []) as unknown as PublicProviderSearchRow[];
}