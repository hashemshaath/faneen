import { supabase } from '@/integrations/supabase/client';

/**
 * Thin read wrappers for `membership_access_keys` and
 * `membership_access_key_usage_log` (MEMB-5).
 */

export interface ListMembershipAccessKeysOptions {
  businessId: string;
  select?: string;
}

export async function listMembershipAccessKeys<T = unknown>({
  businessId,
  select = 'id, name, key_prefix, scopes, tier_at_creation, expires_at, revoked_at, last_used_at, created_at',
}: ListMembershipAccessKeysOptions): Promise<{ data: T[] | null; error: unknown }> {
  const { data, error } = await supabase
    .from('membership_access_keys')
    .select(select)
    .eq('business_id', businessId)
    .order('created_at', { ascending: false });
  return { data: (data as unknown as T[] | null), error };
}

export interface ListAccessKeyUsageLogOptions {
  businessId: string;
  select?: string;
  limit?: number;
}

export async function listAccessKeyUsageLog<T = unknown>({
  businessId,
  select = 'id, access_key_id, endpoint, method, status_code, ip, user_agent, created_at, membership_access_keys(name, key_prefix)',
  limit = 500,
}: ListAccessKeyUsageLogOptions): Promise<{ data: T[] | null; error: unknown }> {
  const { data, error } = await supabase
    .from('membership_access_key_usage_log')
    .select(select)
    .eq('business_id', businessId)
    .order('created_at', { ascending: false })
    .limit(limit);
  return { data: (data as unknown as T[] | null), error };
}