import { supabase } from '@/integrations/supabase/client';

/**
 * Wrapper for the Onboarding "join existing entity by reference" lookup:
 *
 *   supabase.from('businesses')
 *     .select('id')
 *     .or(`ref_id.eq.${REF},legacy_ref_id.eq.${REF}`)
 *     .limit(1)
 *     .maybeSingle()
 *
 * Behavior is preserved verbatim — including upper-casing the reference
 * at the call site. Returns raw `{ data, error }`.
 */
export interface GetBusinessIdByRefOrLegacyRefOptions {
  reference: string;
}

export async function getBusinessIdByRefOrLegacyRef(
  options: GetBusinessIdByRefOrLegacyRefOptions,
): Promise<{ data: { id: string } | null; error: unknown }> {
  const upper = options.reference.toUpperCase();
  const { data, error } = await supabase
    .from('businesses')
    .select('id')
    .or(`ref_id.eq.${upper},legacy_ref_id.eq.${upper}`)
    .limit(1)
    .maybeSingle();
  return { data: (data as unknown as { id: string } | null), error };
}