/**
 * WORKSPACE-RBAC-6A — UI-only permission hint hook.
 *
 * Returns a boolean for whether the active workspace role / explicit
 * permission overrides include the requested permission. Backed by the
 * static role/permission catalog mirrored from the DB seed.
 *
 * NOT FOR AUTHORIZATION. RLS + RPC remain authoritative. Use this only
 * to decide whether to render an action affordance.
 */
import { useMemo } from 'react';
import { useActiveWorkspace } from '@/hooks/useActiveWorkspace';
import { hasWorkspacePermission } from '@/modules/workspace/permissions';

export function useCan(permission: string | null | undefined): boolean {
  const workspace = useActiveWorkspace();
  return useMemo(() => {
    if (!permission) return false;
    return hasWorkspacePermission(
      { active_role: workspace.active_role, permissions: workspace.permissions },
      permission,
    );
  }, [workspace.active_role, workspace.permissions, permission]);
}