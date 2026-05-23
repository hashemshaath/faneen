import { supabase } from '@/integrations/supabase/client';

/**
 * EF-5: Thin wrapper around the `audit-sitemap-status` edge function.
 * When called with no payload, invokes without a `body` to preserve
 * exact no-body semantics. Returns raw `{ data, error }`.
 */
export async function auditSitemapStatus(
  payload?: Record<string, unknown>,
): Promise<ReturnType<typeof supabase.functions.invoke>> {
  if (payload === undefined) {
    return supabase.functions.invoke('audit-sitemap-status');
  }
  return supabase.functions.invoke('audit-sitemap-status', { body: payload });
}