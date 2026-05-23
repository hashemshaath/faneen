import { supabase } from '@/integrations/supabase/client';

/**
 * EF-6: Thin wrapper around the `admin-retry-dlq-email` edge function.
 * Preserves the generic `<T>` return shape from `supabase.functions.invoke`.
 */
export async function adminRetryDlqEmail<T = unknown>(
  payload: { logId: string } & Record<string, unknown>,
): Promise<ReturnType<typeof supabase.functions.invoke<T>>> {
  return supabase.functions.invoke<T>('admin-retry-dlq-email', { body: payload });
}