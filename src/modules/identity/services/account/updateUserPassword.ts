/**
 * Update the current user's password (ID-5).
 *
 * Thin wrapper over `supabase.auth.updateUser({ password })`. Accepts only
 * the password string — never an arbitrary user-update payload — and never
 * returns or logs the password value itself.
 */
import { supabase } from '@/integrations/supabase/client';

export function updateUserPassword(password: string) {
  return supabase.auth.updateUser({ password });
}