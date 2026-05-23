import { supabase } from '@/integrations/supabase/client';

/**
 * EF-4: Thin wrapper around the `weekly-sla-report` edge function.
 *
 * Behavior contract:
 * - When called with no payload, invokes the function with no `body` to
 *   preserve exact no-body semantics used by the admin UI.
 * - When a payload is provided, invokes with `{ body: payload }`.
 * - Returns the raw `{ data, error }` from `supabase.functions.invoke`.
 * - Does not transform, validate, or inspect the response.
 */
export async function runWeeklySlaReport(
  payload?: Record<string, unknown>,
): Promise<ReturnType<typeof supabase.functions.invoke>> {
  if (payload === undefined) {
    return supabase.functions.invoke('weekly-sla-report');
  }
  return supabase.functions.invoke('weekly-sla-report', { body: payload });
}