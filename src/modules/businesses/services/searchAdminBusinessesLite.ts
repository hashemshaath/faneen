import { supabase } from '@/integrations/supabase/client';

/**
 * Canonical wrapper for the admin profile-visibility picker search.
 * Selects only display-safe identifying columns and supports an optional
 * fuzzy `or(...)` search across name_ar / name_en / username / ref_id.
 *
 * Keeps direct `from('businesses')` access inside the businesses service
 * module to satisfy `businesses-reads-isolation-audit`.
 */
export interface AdminBusinessLiteRow {
  id: string;
  name_ar: string | null;
  name_en: string | null;
  username: string | null;
  ref_id: string | null;
}

export interface SearchAdminBusinessesLiteOptions {
  query?: string;
  limit?: number;
}

export async function searchAdminBusinessesLite(
  options: SearchAdminBusinessesLiteOptions = {},
): Promise<{ data: AdminBusinessLiteRow[]; error: unknown }> {
  const { query, limit = 50 } = options;
  let q = supabase
    .from('businesses')
    .select('id, name_ar, name_en, username, ref_id')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (query && query.trim().length > 0) {
    const escaped = query.replace(/[%,]/g, '');
    q = q.or(
      `name_ar.ilike.%${escaped}%,name_en.ilike.%${escaped}%,username.ilike.%${escaped}%,ref_id.ilike.%${escaped}%`,
    );
  }
  const { data, error } = await q;
  return { data: (data ?? []) as unknown as AdminBusinessLiteRow[], error };
}