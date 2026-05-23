/**
 * Get current Supabase user (ID-5).
 * Thin wrapper over `supabase.auth.getUser()`.
 */
import { supabase } from '@/integrations/supabase/client';

export function getCurrentUser() {
  return supabase.auth.getUser();
}