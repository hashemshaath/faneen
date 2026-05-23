import { supabase } from '@/integrations/supabase/client';

/**
 * Thin RPC wrappers for access key lifecycle (MEMB-5).
 */

export interface CreateAccessKeyArgs {
  _name: string;
  _scopes: string[];
  _business_id: string;
}

export async function createAccessKey(args: CreateAccessKeyArgs) {
  const { data, error } = await supabase.rpc('create_access_key', args);
  return { data, error };
}

export interface RevokeAccessKeyArgs {
  _key_id: string;
  _reason: string;
}

export async function revokeAccessKey(args: RevokeAccessKeyArgs) {
  const { data, error } = await supabase.rpc('revoke_access_key', args);
  return { data, error };
}