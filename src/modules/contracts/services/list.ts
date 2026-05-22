/**
 * R2A.2 — Contracts list service wrapper.
 *
 * Read-only helpers for the contracts list view in DashboardContracts.
 * Wraps Q1/Q2 (role-scoped contract lists) and Q13 (participant profiles).
 * Uses the existing Supabase client under the current user JWT — no
 * service-role, no RLS bypass.
 */
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';
import { listProfilesByUserIds } from '@/modules/users';

export type ContractRow = Tables<'contracts'>;
export type ContractRole = 'provider' | 'client';

export interface ContractListFilters {
  userId: string;
  role: ContractRole;
}

export type ContractListProfile = Pick<
  Tables<'profiles'>,
  'user_id' | 'full_name' | 'avatar_url' | 'phone' | 'email'
>;

/**
 * Fetch contracts the user participates in, scoped to a single role.
 * Preserves the original `.select('*').eq(<role>_id, uid).order(created_at desc)` shape.
 */
export async function listContractsForRole(
  filters: ContractListFilters,
): Promise<ContractRow[]> {
  const column = filters.role === 'provider' ? 'provider_id' : 'client_id';
  const { data, error } = await supabase
    .from('contracts')
    .select('*')
    .eq(column, filters.userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

/**
 * Fetch minimal profile rows for the set of users that appear as client or
 * provider on the rendered contract list. Short-circuits on empty input to
 * avoid issuing a `WHERE user_id IN ()` query.
 */
export async function getContractParticipantProfiles(
  userIds: string[],
): Promise<ContractListProfile[]> {
  const { data, error } = await listProfilesByUserIds<ContractListProfile>({
    userIds,
    select: 'user_id, full_name, avatar_url, phone, email',
  });
  if (error) throw error;
  return data ?? [];
}