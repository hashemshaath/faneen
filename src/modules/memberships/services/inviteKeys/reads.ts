import { supabase } from '@/integrations/supabase/client';

/**
 * Thin read wrappers for `membership_invite_keys` and
 * `membership_invite_redemptions` (MEMB-5). Returns raw
 * Supabase `{ data, error }` with no transformation.
 */

export interface ListMembershipInviteKeysOptions {
  businessId: string;
  select?: string;
}

export async function listMembershipInviteKeys<T = unknown>({
  businessId,
  select = 'id, code, role, max_uses, used_count, expires_at, status, created_at',
}: ListMembershipInviteKeysOptions): Promise<{ data: T[] | null; error: unknown }> {
  const { data, error } = await supabase
    .from('membership_invite_keys')
    .select(select)
    .eq('business_id', businessId)
    .order('created_at', { ascending: false });
  return { data: (data as unknown as T[] | null), error };
}

export interface ListMembershipInviteRedemptionsOptions {
  businessId: string;
  select?: string;
  limit?: number;
}

export async function listMembershipInviteRedemptions<T = unknown>({
  businessId,
  select = 'id, invite_key_id, redeemed_by_user_id, business_staff_id, created_at, membership_invite_keys!inner(code, role, business_id)',
  limit = 500,
}: ListMembershipInviteRedemptionsOptions): Promise<{ data: T[] | null; error: unknown }> {
  const { data, error } = await supabase
    .from('membership_invite_redemptions')
    .select(select)
    .eq('membership_invite_keys.business_id', businessId)
    .order('created_at', { ascending: false })
    .limit(limit);
  return { data: (data as unknown as T[] | null), error };
}