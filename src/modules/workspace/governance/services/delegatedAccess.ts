import { supabase } from '@/integrations/supabase/client';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

export interface ListDelegatedWorkspaceAccessOptions {
  businessId: string;
  select?: string;
  onlyActive?: boolean;
}

export async function listDelegatedWorkspaceAccess(
  options: ListDelegatedWorkspaceAccessOptions,
): Promise<{ data: unknown; error: unknown }> {
  const { businessId, select = '*', onlyActive = false } = options;
  let q = db.from('delegated_workspace_access').select(select).eq('business_id', businessId);
  if (onlyActive) q = q.is('revoked_at', null);
  const { data, error } = await q;
  return { data, error };
}

export interface CreateDelegatedWorkspaceAccessPayload {
  business_id: string;
  delegated_to_user_id: string;
  delegated_by_user_id: string;
  reason: string;
  permissions?: string[];
  starts_at?: string;
  expires_at: string;
}

export async function createDelegatedWorkspaceAccess(
  payload: CreateDelegatedWorkspaceAccessPayload,
): Promise<{ data: unknown; error: unknown }> {
  const { data, error } = await db.from('delegated_workspace_access').insert(payload);
  return { data, error };
}

export interface RevokeDelegatedWorkspaceAccessOptions {
  id: string;
  revoked_by: string;
}

export async function revokeDelegatedWorkspaceAccess(
  options: RevokeDelegatedWorkspaceAccessOptions,
): Promise<{ data: unknown; error: unknown }> {
  const { id, revoked_by } = options;
  const { data, error } = await db
    .from('delegated_workspace_access')
    .update({ revoked_at: new Date().toISOString(), revoked_by })
    .eq('id', id);
  return { data, error };
}