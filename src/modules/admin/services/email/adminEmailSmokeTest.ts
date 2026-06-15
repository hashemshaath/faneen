import { supabase } from '@/integrations/supabase/client';

/**
 * EF-6: Thin wrapper around the `admin-email-smoke-test` edge function.
 * Used only by the admin email smoke-test diagnostic surface.
 */
export async function adminEmailSmokeTest<T = unknown>(
  payload: { testEmail: string } & Record<string, unknown>,
): Promise<ReturnType<typeof supabase.functions.invoke<T>>> {
  return supabase.functions.invoke<T>('admin-email-smoke-test', { body: payload });
}