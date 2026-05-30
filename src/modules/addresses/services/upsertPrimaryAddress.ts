import { supabase } from '@/integrations/supabase/client';
import type { AddressFields, AddressRow, OwnerRef, AddressType } from '../types';

/**
 * Upsert THE primary address of `address_type` for the given owner.
 * - If a primary row already exists for (owner, type), it is updated.
 * - Otherwise a new row is inserted with `is_primary=true`.
 *
 * The DB unique partial index
 *   addresses_one_primary_per_owner_type_idx
 * guarantees there is at most one primary per (owner_type, owner_id, address_type).
 */
export interface UpsertPrimaryAddressOptions extends OwnerRef {
  addressType?: AddressType;
  fields: AddressFields;
}

export async function upsertPrimaryAddress(
  options: UpsertPrimaryAddressOptions,
): Promise<{ data: AddressRow | null; error: unknown }> {
  const { ownerType, ownerId, fields } = options;
  const addressType: AddressType = options.addressType ?? fields.address_type ?? 'national_address';

  // Find existing primary for (owner, type)
  const { data: existing, error: findErr } = await supabase
    .from('addresses')
    .select('id')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .eq('owner_type', ownerType as any)
    .eq('owner_id', ownerId)
    .eq('is_primary', true)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .eq('address_type' as any, addressType)
    .maybeSingle();

  if (findErr) return { data: null, error: findErr };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const payload: any = {
    owner_type: ownerType,
    owner_id: ownerId,
    address_type: addressType,
    is_primary: true,
    country_code: fields.country_code ?? 'SA',
    source: fields.source ?? 'manual',
    ...fields,
  };

  if (existing?.id) {
    const { data, error } = await supabase
      .from('addresses')
      .update(payload)
      .eq('id', existing.id)
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