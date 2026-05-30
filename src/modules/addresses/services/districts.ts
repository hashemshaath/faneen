import { supabase } from '@/integrations/supabase/client';
import { SA_REGIONS, type SaRegionId } from '@/data/sa-regions';

/**
 * Districts catalog queries — the ONLY allowed reads of `public.districts`
 * (enforced by the address governance audit test).
 */

export interface DistrictRow {
  id: string;
  country_code: string;
  region: string;
  city: string;
  district_ar: string;
  district_en: string | null;
  city_ar: string | null;
  city_en: string | null;
  region_ar: string | null;
  region_en: string | null;
  is_active: boolean;
}

export interface RegionOption {
  id: SaRegionId;
  name_ar: string;
  name_en: string;
}

/** Static list of the 13 SA regions (canonical source). */
export function listRegions(): RegionOption[] {
  return SA_REGIONS.map((r) => ({ id: r.id, name_ar: r.name_ar, name_en: r.name_en }));
}

/** Districts belonging to a (region, city). */
export async function listDistrictsByCity(
  region: string, city: string,
): Promise<{ data: DistrictRow[]; error: unknown }> {
  if (!region || !city) return { data: [], error: null };
  const { data, error } = await supabase
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .from('districts' as any)
    .select('id, country_code, region, city, district_ar, district_en, city_ar, city_en, region_ar, region_en, is_active')
    .eq('is_active', true)
    .ilike('region', region)
    .ilike('city', city)
    .order('district_ar', { ascending: true })
    .limit(500);
  return { data: (data as unknown as DistrictRow[]) ?? [], error };
}

/** Free-text district search (uses pg_trgm where available, ilike fallback). */
export async function searchDistricts(
  query: string,
  filters: { region?: string; city?: string } = {},
): Promise<{ data: DistrictRow[]; error: unknown }> {
  let q = supabase
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .from('districts' as any)
    .select('id, country_code, region, city, district_ar, district_en, city_ar, city_en, region_ar, region_en, is_active')
    .eq('is_active', true);
  if (filters.region) q = q.ilike('region', filters.region);
  if (filters.city) q = q.ilike('city', filters.city);
  if (query && query.trim().length > 0) {
    const term = `%${query.trim()}%`;
    q = q.or(`district_ar.ilike.${term},district_en.ilike.${term}`);
  }
  const { data, error } = await q.order('district_ar').limit(50);
  return { data: (data as unknown as DistrictRow[]) ?? [], error };
}