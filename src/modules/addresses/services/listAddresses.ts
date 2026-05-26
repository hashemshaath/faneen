import { supabase } from '@/integrations/supabase/client';
import type { AddressRow, OwnerRef } from '../types';

/**
 * List every address row belonging to the given owner, primary first.
 * Returns raw `{ data, error }` — never throws on its own.
 */
export async function listAddresses(
  owner: OwnerRef,
): Promise<{ data: AddressRow[] | null; error: unknown }> {
  const { data, error } = await supabase
    .from('addresses')
    .select('*')
    .eq('owner_type', owner.ownerType)
    .eq('owner_id', owner.ownerId)
    .order('is_primary', { ascending: false })
    .order('created_at', { ascending: true });
  return { data: data as AddressRow[] | null, error };
}