import { supabase } from '@/integrations/supabase/client';

/**
 * Canonical wrapper for the ContractDetail party-profile lookup:
 *
 *   supabase.from('profiles')
 *     .select('*, countries(name_ar, name_en, currency_code), cities(name_ar, name_en)')
 *     .eq('user_id', userId)
 *     .maybeSingle()
 */
export interface GetProfileForContractPartyOptions {
  userId: string;
  select?: string;
}

const DEFAULT_SELECT =
  '*, countries(name_ar, name_en, currency_code), cities(name_ar, name_en)';

export async function getProfileForContractParty<T = unknown>(
  options: GetProfileForContractPartyOptions,
): Promise<{ data: T | null; error: unknown }> {
  const { userId, select = DEFAULT_SELECT } = options;
  const { data, error } = await supabase
    .from('profiles')
    .select(select)
    .eq('user_id', userId)
    .maybeSingle();
  return { data: (data as unknown as T | null), error };
}