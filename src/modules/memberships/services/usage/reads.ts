import { supabase } from '@/integrations/supabase/client';

/**
 * Thin RPC wrappers for membership usage/feature reads (MEMB-2).
 *
 * Pass through RPC arguments and return raw `{ data, error }`.
 * No transformation, no fallbacks — callsites preserve their own
 * error/fallback handling verbatim.
 */

export interface HasMembershipFeatureArgs {
  _user_id: string;
  _feature_key: string;
  _business_id?: string;
}

export async function hasMembershipFeature(
  args: HasMembershipFeatureArgs,
): Promise<{ data: boolean | null; error: unknown }> {
  const { data, error } = await supabase.rpc('has_membership_feature', args);
  return { data: (data as boolean | null) ?? null, error };
}

export interface GetMembershipUsageArgs {
  _user_id?: string;
  _business_id?: string;
}

export async function getMembershipUsage<T = unknown>(
  args: GetMembershipUsageArgs,
): Promise<{ data: T[] | null; error: unknown }> {
  const { data, error } = await supabase.rpc('get_membership_usage', args);
  return { data: (data as unknown as T[] | null) ?? null, error };
}