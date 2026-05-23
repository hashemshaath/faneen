/**
 * Role mutations — canonical (ID-3).
 *
 * Moved verbatim from `src/services/userRoles.ts`. Behavior, payloads,
 * filters, and error normalization are preserved exactly. The legacy
 * `@/services/userRoles` module is now a compatibility shim that
 * re-exports these functions.
 */
import { supabase } from '@/integrations/supabase/client';
import { callRpc } from '@/services/rpc';
import type { AppRole } from './reads';

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