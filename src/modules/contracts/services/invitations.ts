/**
 * R2A.4 — Client invitation service wrappers.
 * Thin pass-through over SECURITY DEFINER RPCs. All throw on error.
 * Argument shapes match the real call sites verbatim.
 */
import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';

export interface CreateClientInvitationArgs {
  email: string;
  name?: string | null;
  phone?: string | null;
  businessId?: string | null;
  draftPayload?: Json | null;
  templateVersionId?: string | null;
  workType?: string | null;
}

export async function createClientInvitation(args: CreateClientInvitationArgs): Promise<unknown> {
  const { data, error } = await supabase.rpc('create_client_invitation', {
    _email: args.email,
    _name: args.name ?? null,
    _phone: args.phone ?? null,
    _business_id: args.businessId ?? null,
    _draft_payload: args.draftPayload ?? null,
    _template_version_id: args.templateVersionId ?? null,
    _work_type: args.workType ?? null,
  });
  if (error) throw error;
  return data;
}

export async function resendClientInvitation(id: string): Promise<unknown> {
  const { data, error } = await supabase.rpc('resend_client_invitation', { _id: id });
  if (error) throw error;
  return data;
}

export async function cancelClientInvitation(id: string): Promise<void> {
  const { error } = await supabase.rpc('cancel_client_invitation', { _id: id });
  if (error) throw error;
}