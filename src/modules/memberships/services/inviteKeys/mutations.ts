import { supabase } from '@/integrations/supabase/client';

/**
 * Thin RPC wrappers for invite key lifecycle (MEMB-5).
 */

export interface GenerateInviteKeyArgs {
  _business_id: string;
  _role: 'viewer' | 'editor' | 'manager' | 'owner';
  _max_uses: number;
  _valid_days: number | null;
  _notes: string | null;
}

export async function generateInviteKey(args: GenerateInviteKeyArgs) {
  const { data, error } = await supabase.rpc('generate_invite_key', args);
  return { data, error };
}

export interface RevokeInviteKeyArgs {
  _key_id: string;
  _reason: string;
}

export async function revokeInviteKey(args: RevokeInviteKeyArgs) {
  const { data, error } = await supabase.rpc('revoke_invite_key', args);
  return { data, error };
}