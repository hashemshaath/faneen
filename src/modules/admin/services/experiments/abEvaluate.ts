import { supabase } from '@/integrations/supabase/client';

/**
 * EF-5: Thin wrapper around the `ab-evaluate` edge function.
 * No-body invocation preserved when called without arguments.
 * Returns raw `{ data, error }`.
 */
export async function abEvaluate(
  payload?: Record<string, unknown>,
): Promise<ReturnType<typeof supabase.functions.invoke>> {
  if (payload === undefined) {
    return supabase.functions.invoke('ab-evaluate');
  }
  return supabase.functions.invoke('ab-evaluate', { body: payload });
}