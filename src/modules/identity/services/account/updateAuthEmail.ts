/**
 * Update the current user's auth/login email (STAB-1A).
 *
 * Thin wrapper over `supabase.auth.updateUser({ email })`. Mirrors the
 * existing `updateUserPassword` boundary so all auth-user mutations live
 * inside `src/modules/identity/services/account`.
 *
 * Returns the raw `{ data, error }` envelope from supabase-js so callers
 * keep their existing error-handling control flow (throw on `error`,
 * toast on success, etc.).
 */
import { supabase } from '@/integrations/supabase/client';

export function updateAuthEmail(email: string) {
  return supabase.auth.updateUser({ email });
}