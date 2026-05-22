import { supabase } from '@/integrations/supabase/client';

/**
 * Canonical wrapper for the ContractDetail business join used by both the
 * visible contract header and the PDF export. Preserves `.maybeSingle()`
 * semantics and the exact `categories(name_ar, name_en)` join.
 */
const DEFAULT_SELECT = '*, categories(name_ar, name_en)';

export interface GetBusinessForContractOptions {
  select?: string;
}

export async function getBusinessForContract<T = unknown>(
  businessId: string,
  options: GetBusinessForContractOptions = {},
): Promise<{ data: T | null; error: unknown }> {
  const { select = DEFAULT_SELECT } = options;
  const { data, error } = await supabase
    .from('businesses')
    .select(select)
    .eq('id', businessId)
    .maybeSingle();
  return { data: (data as unknown as T | null), error };
}