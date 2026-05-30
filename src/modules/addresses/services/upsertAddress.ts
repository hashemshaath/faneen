import { supabase } from '@/integrations/supabase/client';
import type { AddressFields, AddressRow, OwnerRef } from '../types';

export interface UpsertAddressOptions extends OwnerRef {
  id?: string | null;
  fields: AddressFields;
}

/**
 * Insert or update an address row for the given owner. When `id` is present,
 * the row is updated by primary key; otherwise a new row is inserted.
 */
export async function upsertAddress(
  options: UpsertAddressOptions,
): Promise<{ data: AddressRow | null; error: unknown }> {
  const { id, ownerType, ownerId, fields } = options;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const payload: any = {
    owner_type: ownerType,
    owner_id: ownerId,
    ...fields,
    source: fields.source ?? 'manual',
  };
  if (id) {
    const { data, error } = await supabase
      .from('addresses')
      .update(payload)
      .eq('id', id)
      .select('*')
      .maybeSingle();
    return { data: data as AddressRow | null, error };
  }
  const { data, error } = await supabase
    .from('addresses')
    .insert(payload)
    .select('*')
    .maybeSingle();
  return { data: data as AddressRow | null, error };
}