/**
 * Preview a staff invitation by token (ID-5).
 * Wraps `supabase.rpc('get_staff_invitation_preview', { _token })`.
 */
import { supabase } from '@/integrations/supabase/client';

export interface GetStaffInvitationPreviewParams {
  _token: string;
}

export function getStaffInvitationPreview(params: GetStaffInvitationPreviewParams) {
  return supabase.rpc('get_staff_invitation_preview', params);
}