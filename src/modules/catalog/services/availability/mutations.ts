import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

/**
 * Thin write wrappers for `business_availability` (CAT-3 — provider).
 * The replace-all flow (delete then insert) is kept as two separate calls
 * so callsites preserve their existing control flow and empty-rows guard.
 */

export type AvailabilityInsertPayload =
  Database['public']['Tables']['business_availability']['Insert'];

export async function deleteAvailabilityForBusiness(businessId: string) {
  return await supabase
    .from('business_availability')
    .delete()
    .eq('business_id', businessId);
}

export async function insertAvailabilityRows(rows: AvailabilityInsertPayload[]) {
  return await supabase.from('business_availability').insert(rows);
}