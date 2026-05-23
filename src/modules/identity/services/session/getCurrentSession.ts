/**
 * Get current Supabase session (ID-5).
 *
 * Thin wrapper over `supabase.auth.getSession()`. Returns the raw result so
 * callers preserve their existing destructuring patterns.
 *
 * NOTE: `AuthContext` remains the central session owner and is allowed to
 * call `supabase.auth.getSession()` directly. Use this wrapper for
 * downstream, point-in-time reads (e.g. diagnostics, settings panel).
 */
import { supabase } from '@/integrations/supabase/client';

export function getCurrentSession() {
  return supabase.auth.getSession();
}