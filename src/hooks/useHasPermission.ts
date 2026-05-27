/**
 * WORKSPACE-RBAC-6E — Server-side permission read hook (shadow / parity).
 *
 * Calls `public.has_permission` via the canonical wrapper. Returns
 *   { data: boolean | null, isLoading, error }
 *
 * Does NOT enforce. UI affordances continue to use the static
 * `useCan` hint. The hook is wired through `usePermissionParity`
 * only on the existing 6C/6D-gated buttons so we can compare layers
 * before promoting `has_permission` into RLS in a future phase.
 */
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { useActiveWorkspace } from '@/hooks/useActiveWorkspace';
import { hasPermissionServer } from '@/modules/workspace/services/hasPermissionServer';

export interface UseHasPermissionResult {
  data: boolean | null;
  isLoading: boolean;
  error: unknown;
}

export function useHasPermission(permission: string | null | undefined): UseHasPermissionResult {
  const { user } = useAuth();
  const workspace = useActiveWorkspace();
  const userId = user?.id ?? null;
  const entityId = workspace.active_entity_id ?? null;
  const enabled = Boolean(userId && entityId && permission);

  const q = useQuery({
    queryKey: ['workspace', 'has_permission', userId, entityId, permission],
    enabled,
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await hasPermissionServer({
        userId: userId as string,
        entityId: entityId as string,
        permission: permission as string,
      });
      if (error) throw error;
      return data;
    },
  });

  return {
    data: enabled ? (q.data ?? null) : null,
    isLoading: enabled ? q.isLoading : false,
    error: q.error ?? null,
  };
}