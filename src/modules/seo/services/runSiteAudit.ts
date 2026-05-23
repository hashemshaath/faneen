import { supabase } from '@/integrations/supabase/client';

/**
 * EF-5: Thin wrapper around the `run-site-audit` edge function.
 * No-body invocation preserved when called without arguments.
 * Returns raw `{ data, error }`.
 */
export async function runSiteAudit(
  payload?: Record<string, unknown>,
): Promise<ReturnType<typeof supabase.functions.invoke>> {
  if (payload === undefined) {
    return supabase.functions.invoke('run-site-audit');
  }
  return supabase.functions.invoke('run-site-audit', { body: payload });
}