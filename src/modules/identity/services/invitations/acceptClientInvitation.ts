/**
 * Accept a client invitation by token (ID-5).
 * Wraps `supabase.rpc('accept_client_invitation', { _token })`.
 */
import { supabase } from '@/integrations/supabase/client';

export interface AcceptClientInvitationParams {
  _token: string;
}

export function acceptClientInvitation(params: AcceptClientInvitationParams) {
  return supabase.rpc('accept_client_invitation', params);
}