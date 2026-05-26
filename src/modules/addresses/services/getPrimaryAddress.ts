import { supabase } from '@/integrations/supabase/client';
import type { AddressRow, OwnerRef } from '../types';

/** Return the single primary address for the owner (or null). */
export async function getPrimaryAddress(
  owner: OwnerRef,
): Promise<{ data: AddressRow | null; error: unknown }> {
  const { data, error } = await supabase
    .from('addresses')
    .select('*')
    .eq('owner_type', owner.ownerType)
    .eq('owner_id', owner.ownerId)
    .eq('is_primary', true)
    .maybeSingle();
  return { data: data as AddressRow | null, error };
}