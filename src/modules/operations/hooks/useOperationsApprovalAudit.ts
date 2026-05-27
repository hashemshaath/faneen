/**
 * BUSINESS-OPERATIONS-2P — Read recent sanitized production approval
 * audit entries. Manual-refresh only; no polling.
 */
import { useQuery } from '@tanstack/react-query';
import {
  listOperationsApprovalAudit,
  OPERATIONS_APPROVAL_AUDIT_CAP,
  type ListOperationsApprovalAuditDeps,
  type OperationsApprovalAuditEntry,
} from '../services/listOperationsApprovalAudit';

export const OPERATIONS_APPROVAL_AUDIT_QUERY_KEY = [
  'admin', 'operations', 'approval-audit',
] as const;

export interface UseOperationsApprovalAuditOptions {
  limit?: number;
  enabled?: boolean;
  readDeps?: ListOperationsApprovalAuditDeps;
}

export interface UseOperationsApprovalAuditResult {
  entries: OperationsApprovalAuditEntry[];
  isLoading: boolean;
  isFetching: boolean;
  isError: boolean;
  error: Error | null;
  cap: number;
  refetch: () => Promise<unknown>;
}

export function useOperationsApprovalAudit(
  options: UseOperationsApprovalAuditOptions = {},
): UseOperationsApprovalAuditResult {
  const { limit = OPERATIONS_APPROVAL_AUDIT_CAP, enabled = true, readDeps } = options;
  const cap = Math.min(Math.max(limit | 0, 1), OPERATIONS_APPROVAL_AUDIT_CAP);

  const query = useQuery({
    queryKey: [...OPERATIONS_APPROVAL_AUDIT_QUERY_KEY, { cap }],
    queryFn: async () => {
      const res = await listOperationsApprovalAudit(cap, readDeps ?? {});
      if (!res.ok) throw new Error(res.error ?? 'failed to load approval audit');
      return res.entries;
    },
    enabled,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchInterval: false,
    staleTime: 60_000,
    retry: 0,
  });

  return {
    entries: query.data ?? [],
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isError: query.isError,
    error: (query.error as Error | null) ?? null,
    cap,
    refetch: () => query.refetch(),
  };
}