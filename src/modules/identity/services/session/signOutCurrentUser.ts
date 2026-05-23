/**
 * Sign out current Supabase session (ID-5).
 *
 * Thin wrapper over `supabase.auth.signOut()`. Returns the raw result;
 * callers preserve their existing fire-and-forget or navigation behavior.
 * `AuthContext` and `authService.signOut` remain allowed to call the
 * underlying API directly.
 */
import { supabase } from '@/integrations/supabase/client';

export function signOutCurrentUser() {
  return supabase.auth.signOut();
}