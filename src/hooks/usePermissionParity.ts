/**
 * WORKSPACE-RBAC-6E — Shadow parity between static useCan and server has_permission.
 *
 * Compares the synchronous UI hint (`useCan`) with the server RPC
 * (`useHasPermission`) and logs a single console.warn on mismatch
 * — only in non-production. Never blocks rendering. Never throws.
 * The return value is observability metadata; callers must NOT branch
 * on it for security decisions.
 */
import { useEffect, useRef } from 'react';
import { useCan } from '@/hooks/useCan';
import { useHasPermission } from '@/hooks/useHasPermission';

export interface PermissionParity {
  client: boolean;
  server: boolean | null;
  isLoading: boolean;
  mismatch: boolean;
}

function isProductionEnv(): boolean {
  try {
    if (typeof import.meta !== 'undefined' && (import.meta as { env?: { PROD?: boolean } }).env) {
      return Boolean((import.meta as { env: { PROD?: boolean } }).env.PROD);
    }
  } catch {
    // ignore
  }
  return false;
}

export function usePermissionParity(permission: string | null | undefined): PermissionParity {
  const client = useCan(permission);
  const { data: server, isLoading } = useHasPermission(permission);
  const warned = useRef(false);
  const mismatch = server !== null && server !== client;

  useEffect(() => {
    if (warned.current) return;
    if (isLoading || server === null) return;
    if (!mismatch) return;
    if (isProductionEnv()) return;
    warned.current = true;
    try {
      // eslint-disable-next-line no-console
      console.warn(
        `[rbac-parity] mismatch for "${permission}": client=${client} server=${server}`,
      );
    } catch {
      // never throw from observability
    }
  }, [permission, client, server, mismatch, isLoading]);

  return { client, server, isLoading, mismatch };
}