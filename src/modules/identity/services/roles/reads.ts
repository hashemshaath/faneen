/**
 * ID-2 — Identity role read service (canonical).
 *
 * Centralizes all read-only access to the `user_roles` table and the
 * `has_role` SECURITY DEFINER RPC. All call shapes (table name, select
 * columns, filters, RPC name + params) and fallback behavior are
 * preserved verbatim from the legacy `src/services/userRoles.ts`
 * wrappers (which now delegate here).
 *
 * Mutations (`grantRole`, `revokeRoleById`, `revokeRoleByUserAndRole`)
 * intentionally stay in `src/services/userRoles.ts` until ID-3.
 */
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';
import { safeRpc } from '@/services/rpc';

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