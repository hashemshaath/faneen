/**
 * Accept a staff invitation by token (ID-5).
 * Wraps `supabase.rpc('accept_staff_invitation', { _token })`.
 */
import { supabase } from '@/integrations/supabase/client';

export interface AcceptStaffInvitationParams {
  _token: string;
}

export function acceptStaffInvitation(params: AcceptStaffInvitationParams) {
  return supabase.rpc('accept_staff_invitation', params);
}