import { supabase } from '@/integrations/supabase/client';

/**
 * EF-3: Thin wrapper around the `ai-center` edge function.
 *
 * Behavior contract:
 * - Invokes `ai-center` with `{ body: payload }` verbatim.
 * - Returns the raw `{ data, error }` result from `supabase.functions.invoke`.
 * - Does not transform, validate, or inspect the payload or response.
 * - Does not throw unless `supabase.functions.invoke` throws.
 */
export async function invokeAiCenter(
  payload: Record<string, unknown>,
): Promise<ReturnType<typeof supabase.functions.invoke>> {
  return supabase.functions.invoke('ai-center', { body: payload });
}