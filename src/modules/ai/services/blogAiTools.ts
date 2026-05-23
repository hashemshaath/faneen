import { supabase } from '@/integrations/supabase/client';

/**
 * EF-3: Thin wrapper around the `blog-ai-tools` edge function.
 *
 * Behavior contract:
 * - Invokes `blog-ai-tools` with `{ body: payload }` verbatim.
 * - Returns the raw `{ data, error }` result from `supabase.functions.invoke`.
 * - Does not transform, validate, or inspect the payload or response.
 * - Does not throw unless `supabase.functions.invoke` throws.
 * - All AI prompt/content shaping stays in callsites and the edge function.
 */
export async function invokeBlogAiTools(
  payload: Record<string, unknown>,
): Promise<ReturnType<typeof supabase.functions.invoke>> {
  return supabase.functions.invoke('blog-ai-tools', { body: payload });
}