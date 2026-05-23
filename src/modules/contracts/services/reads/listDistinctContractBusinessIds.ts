/**
 * CT-2 — Admin helper: list distinct non-null `business_id` values present
 * on the contracts table. Used by AdminBusinesses to mark which businesses
 * have at least one contract.
 */
import { supabase } from '@/integrations/supabase/client';

export async function listDistinctContractBusinessIds() {
  return supabase.from('contracts').select('business_id').not('business_id', 'is', null);
}
