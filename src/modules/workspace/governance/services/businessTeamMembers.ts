import { supabase } from '@/integrations/supabase/client';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

export interface ListBusinessTeamMembersOptions {
  teamId: string;
  select?: string;
  includeInactive?: boolean;
}

export async function listBusinessTeamMembers(
  options: ListBusinessTeamMembersOptions,
): Promise<{ data: unknown; error: unknown }> {
  const { teamId, select = '*', includeInactive = false } = options;
  let q = db.from('business_team_members').select(select).eq('team_id', teamId);
  if (!includeInactive) q = q.eq('is_active', true);
  const { data, error } = await q;
  return { data, error };
}

export interface AddBusinessTeamMemberPayload {
  team_id: string;
  business_staff_id: string;
  role_in_team?: 'lead' | 'member' | 'viewer';
  created_by?: string | null;
}

export async function addBusinessTeamMember(
  payload: AddBusinessTeamMemberPayload,
): Promise<{ data: unknown; error: unknown }> {
  const { data, error } = await db.from('business_team_members').insert(payload);
  return { data, error };
}

export async function deactivateBusinessTeamMember(
  id: string,
): Promise<{ data: unknown; error: unknown }> {
  const { data, error } = await db
    .from('business_team_members')
    .update({ is_active: false })
    .eq('id', id);
  return { data, error };
}