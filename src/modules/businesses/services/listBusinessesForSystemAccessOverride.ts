import { supabase } from '@/integrations/supabase/client';

/**
 * MEMBERSHIP-SYSTEM-ACCESS-GOVERNANCE-2 — Canonical wrapper for the
 * Super Admin business selector in the system-access override panel.
 *
 * Returns only display-safe fields (no PII):
 * - id
 * - name_ar
 * - name_en
 * - ref_id
 *
 * Ordered by created_at desc, limited to 500 rows.
 * Throws on Supabase error.
 */
export interface SystemAccessOverrideBusiness {
  id: string;
  name_ar: string | null;
  name_en: string | null;
  ref_id: string | null;
}

export async function listBusinessesForSystemAccessOverride(): Promise<SystemAccessOverrideBusiness[]> {
  const { data, error } = await supabase
    .from('businesses')
    .select('id, name_ar, name_en, ref_id')
    .order('created_at', { ascending: false })
    .limit(500);
  if (error) throw error;
  return (data ?? []) as SystemAccessOverrideBusiness[];
}
