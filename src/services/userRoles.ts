/**
 * User roles service wrappers (R1A foundation).
 *
 * SECURITY:
 *  - Authoritative role checks live in the `has_role` SQL function
 *    (security definer). These wrappers call it; they do not invent
 *    new client-side role logic.
 *  - No callsites are migrated in R1A. AuthContext and AdminUsers
 *    continue to use their existing direct queries until R1B.
 */
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';
import { callRpc, safeRpc } from './rpc';

export type AppRole = Database['public']['Enums']['app_role'];

export interface UserRoleRow {
  id: string;
  user_id: string;
  role: AppRole;
}

export async function getUserRoles(userId: string): Promise<AppRole[]> {
  if (!userId) return [];
  const res = await safeRpc<Array<{ role: AppRole }>>(
    supabase.from('user_roles').select('role').eq('user_id', userId)
  );
  if (!res.ok || !res.data) return [];
  return res.data.map((r) => r.role);
}

export async function hasRole(userId: string, role: AppRole): Promise<boolean> {
  if (!userId) return false;
  const res = await safeRpc<boolean>(
    supabase.rpc('has_role', { _user_id: userId, _role: role })
  );
  return res.ok ? Boolean(res.data) : false;
}

export async function hasAdminAccess(userId: string): Promise<boolean> {
  if (!userId) return false;
  const [admin, superAdmin] = await Promise.all([
    hasRole(userId, 'admin'),
    hasRole(userId, 'super_admin'),
  ]);
  return admin || superAdmin;
}

export async function hasSuperAdminAccess(userId: string): Promise<boolean> {
  return hasRole(userId, 'super_admin');
}

/* ─── R1C C1: admin role management wrappers (no callsites yet) ──────────
 * Reads use safeRpc and return [] on failure (mirrors getUserRoles).
 * Writes use callRpc and THROW a normalized Error so React Query `onError`
 * can branch on `err.normalized.code` (e.g. 'DUPLICATE_KEY', 'RLS_DENIED').
 * Never uses the service role. All operations remain RLS-policy-backed.
 */

export async function listAllUserRoles(): Promise<UserRoleRow[]> {
  const res = await safeRpc<UserRoleRow[]>(
    supabase.from('user_roles').select('id, user_id, role')
  );
  return res.ok && res.data ? res.data : [];
}

export async function listUserRolesFor(userId: string): Promise<UserRoleRow[]> {
  if (!userId) return [];
  const res = await safeRpc<UserRoleRow[]>(
    supabase.from('user_roles').select('id, user_id, role').eq('user_id', userId)
  );
  return res.ok && res.data ? res.data : [];
}

export async function grantRole(userId: string, role: AppRole): Promise<void> {
  await callRpc(
    supabase.from('user_roles').insert({ user_id: userId, role })
  );
}

export async function revokeRoleById(roleRowId: string): Promise<void> {
  await callRpc(
    supabase.from('user_roles').delete().eq('id', roleRowId)
  );
}

export async function revokeRoleByUserAndRole(userId: string, role: AppRole): Promise<void> {
  await callRpc(
    supabase.from('user_roles').delete().eq('user_id', userId).eq('role', role)
  );
}

const ZERO_ROLE_COUNTS = (): Record<AppRole, number> =>
  ({ admin: 0, super_admin: 0, user: 0, moderator: 0 } as Record<AppRole, number>);

export async function countByRole(): Promise<Record<AppRole, number>> {
  const res = await safeRpc<Array<{ role: AppRole }>>(
    supabase.from('user_roles').select('role')
  );
  const out = ZERO_ROLE_COUNTS();
  if (!res.ok || !res.data) return out;
  for (const row of res.data) {
    out[row.role] = (out[row.role] ?? 0) + 1;
  }
  return out;
}
