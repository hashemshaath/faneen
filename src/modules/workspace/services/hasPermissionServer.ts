/**
 * WORKSPACE-RBAC-6E — Thin RPC wrapper around `public.has_permission`.
 *
 * Observability/parity only. Never used for enforcement in this phase.
 * Returns raw `{ data, error }` shape — no fallbacks, no throws.
 */
import { supabase } from '@/integrations/supabase/client';

export interface HasPermissionServerArgs {
  userId: string;
  entityId: string;
  permission: string;
}

export async function hasPermissionServer(
  args: HasPermissionServerArgs,
): Promise<{ data: boolean | null; error: unknown }> {
  const { userId, entityId, permission } = args;
  if (!userId || !entityId || !permission) {
    return { data: null, error: null };
  }
  const { data, error } = await supabase.rpc('has_permission', {
    _user_id: userId,
    _entity_id: entityId,
    _permission: permission,
  });
  return { data: (data as boolean | null) ?? null, error };
}