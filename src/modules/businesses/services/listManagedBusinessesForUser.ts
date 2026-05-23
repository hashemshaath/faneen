import { supabase } from '@/integrations/supabase/client';

/**
 * P-24: Canonical aggregator returning the deduped set of businesses a user
 * manages — owner-of via `businesses.user_id` ∪ active staff (`owner` or
 * `manager`) via `business_staff`. Owned rows come first, staff rows second;
 * later same-id staff rows overwrite earlier owned entries (matches existing
 * Map-merge behavior). Rows with a missing joined business are skipped.
 *
 * Behavior is preserved verbatim from the legacy
 * `getManagedBusinessesForUser` lead service so callsites and tests can rely
 * on identical query shapes.
 */
export interface ManagedBusiness {
  id: string;
  name_ar: string | null;
  name_en: string | null;
}

export async function listManagedBusinessesForUser(
  userId: string,
): Promise<ManagedBusiness[]> {
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