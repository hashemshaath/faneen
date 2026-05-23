/**
 * List the current user's staff invitations (ID-5).
 * Wraps `supabase.rpc('get_my_staff_invitations')` (no args).
 */
import { supabase } from '@/integrations/supabase/client';

export function listMyStaffInvitations() {
  return supabase.rpc('get_my_staff_invitations');
}