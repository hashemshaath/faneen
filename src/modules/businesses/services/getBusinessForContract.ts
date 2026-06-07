import { supabase } from '@/integrations/supabase/client';

/**
 * Canonical wrapper for the ContractDetail business join used by both the
 * visible contract header and the PDF export. Preserves `.maybeSingle()`
 * semantics. Phase 16: legacy `categories(...)` join removed; category
 * labels are resolved via the taxonomy module on the consumer side.
 */
const DEFAULT_SELECT = '*';

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