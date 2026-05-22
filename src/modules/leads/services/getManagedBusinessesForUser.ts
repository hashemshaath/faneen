import { supabase } from '@/integrations/supabase/client';

export interface ManagedBusiness {
  id: string;
  name_ar: string | null;
  name_en: string | null;
}

/**
 * D4: Resolves the list of businesses a user manages (owner or manager),
 * deduplicated by id. Extracted verbatim from DashboardLeads.tsx so the two
 * lookups (`businesses` by owner user_id and `business_staff` joined to
 * `businesses`) and dedup behavior are preserved exactly.
 */
export async function getManagedBusinessesForUser(userId: string): Promise<ManagedBusiness[]> {
  const [owned, staff] = await Promise.all([
    supabase.from('businesses').select('id, name_ar, name_en').eq('user_id', userId),
    supabase.from('business_staff')
      .select('business_id, role, businesses:business_id(id, name_ar, name_en)')
      .eq('user_id', userId).eq('is_active', true).in('role', ['owner','manager']),
  ]);
  const map = new Map<string, ManagedBusiness>();
  (owned.data ?? []).forEach((b) => map.set(b.id, b));
  (staff.data ?? []).forEach((s) => {
    const b = (s as unknown as { businesses?: ManagedBusiness }).businesses;
    if (b) map.set(b.id, b);
  });
  return Array.from(map.values());
}