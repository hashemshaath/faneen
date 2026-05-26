import { supabase } from '@/integrations/supabase/client';

/**
 * EF-6: Thin wrapper around the `analyze-contract-document` edge function.
 * Preserves the raw `{ data, error }` shape returned by `functions.invoke`.
 */
export async function analyzeContractDocument<T = unknown>(
  payload: Record<string, unknown>,
): Promise<ReturnType<typeof supabase.functions.invoke<T>>> {
  return supabase.functions.invoke<T>('analyze-contract-document', { body: payload });
}