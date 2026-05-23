import { supabase } from '@/integrations/supabase/client';

/**
 * EF-6: Thin wrapper around the `admin-preview-email` edge function.
 * Preserves the generic `<T>` return shape from `supabase.functions.invoke`.
 */
export async function adminPreviewEmail<T = unknown>(
  payload: { templateName: string } & Record<string, unknown>,
): Promise<ReturnType<typeof supabase.functions.invoke<T>>> {
  return supabase.functions.invoke<T>('admin-preview-email', { body: payload });
}