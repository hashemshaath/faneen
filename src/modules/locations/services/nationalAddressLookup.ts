import { supabase } from '@/integrations/supabase/client';

/**
 * EF-6: Thin wrapper around the `national-address-lookup` edge function.
 * Preserves the raw `{ data, error }` shape returned by `functions.invoke`.
 */
export interface NationalAddressLookupBody {
  shortAddress: string;
}

export async function nationalAddressLookup<T = unknown>(
  body: NationalAddressLookupBody,
): Promise<ReturnType<typeof supabase.functions.invoke<T>>> {
  return supabase.functions.invoke<T>('national-address-lookup', { body });
}