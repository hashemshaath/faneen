/**
 * User roles service (compatibility shim — ID-2).
 *
 * Role READS are now canonical in
 * `src/modules/identity/services/roles/reads.ts` and re-exported here for
 * backward compatibility. Role MUTATIONS (`grantRole`, `revokeRoleById`,
 * `revokeRoleByUserAndRole`) still live here verbatim and will move to
 * the identity module in ID-3.
 *
 * New code should import role reads from `@/modules/identity`.
 */
import { supabase } from '@/integrations/supabase/client';
import { callRpc } from './rpc';
import type { AppRole } from '@/modules/identity';

export type { AppRole, UserRoleRow } from '@/modules/identity';
export {
  getUserRoles,
  hasRole,
  hasAdminAccess,
  hasSuperAdminAccess,
  listAllUserRoles,
  listUserRolesFor,
  countByRole,
} from '@/modules/identity';

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
