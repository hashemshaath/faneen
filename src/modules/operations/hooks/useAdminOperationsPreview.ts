/**
 * BUSINESS-OPERATIONS-2J — Admin operations dry-run preview hook.
 *
 * Thin React Query wrapper around `previewSlaSweepForAdmin`. Manual
 * refresh only (no polling, no cron). The preview itself is dry-run by
 * construction — this hook never invokes alert writers or notification
 * dispatchers and cannot enable real-run mode.
 */
import { useCallback, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  previewSlaSweepForAdmin,
  type PreviewSlaSweepInput,
  type PreviewSlaSweepResult,
} from '../services/previewSlaSweepForAdmin';

export const ADMIN_OPERATIONS_PREVIEW_QUERY_KEY = ['admin', 'operations', 'sla-preview'] as const;

export interface UseAdminOperationsPreviewOptions {
  /** Forwarded as-is to the preview service. */
  sampleLimit?: number;
  /** Persist run log to cron-runs. Defaults to false in the admin UI. */
  persistLog?: boolean;
  /** When false, the query is held back until manually refetched. */
  enabled?: boolean;
}

export interface UseAdminOperationsPreviewResult {
  data: PreviewSlaSweepResult | undefined;
  isLoading: boolean;
  isFetching: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => Promise<unknown>;
  fetchedAt: number | undefined;
  /**
   * Timestamp of the most recent SUCCESSFUL fetch. Distinct from
   * `fetchedAt` so the UI can render "last good preview" separately
   * from any in-flight refresh state.
   */
  lastSuccessfulAt: number | undefined;
  /** Coarse UI phase for status badges. */
  phase: 'idle' | 'loading' | 'refreshing' | 'success' | 'error' | 'partial';
}

export function useAdminOperationsPreview(
  options: UseAdminOperationsPreviewOptions = {},
): UseAdminOperationsPreviewResult {
  const { sampleLimit, persistLog = false, enabled = true } = options;

  const query = useQuery({
    queryKey: [...ADMIN_OPERATIONS_PREVIEW_QUERY_KEY, { sampleLimit, persistLog }],
    queryFn: async () => {
      const input: PreviewSlaSweepInput = { sampleLimit, persistLog };
      return previewSlaSweepForAdmin(input);
    },
    enabled,
    // Manual-refresh dashboard. No background polling.
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchInterval: false,
    staleTime: 60_000,
    retry: 0,
  });

  // Track last successful fetch independent of error state. React Query
  // already preserves the previous `data` after a failed refetch, but we
  // also need a separate "last good" timestamp for the dashboard banner.
  const lastSuccessfulAtRef = useRef<number | undefined>(undefined);
  useEffect(() => {
    if (query.isSuccess && query.dataUpdatedAt) {
      lastSuccessfulAtRef.current = query.dataUpdatedAt;
    }
  }, [query.isSuccess, query.dataUpdatedAt]);

  // Debounced refetch: ignore overlapping triggers while a fetch is in
  // flight. Prevents refresh-spam without changing service behavior.
  const inFlightRef = useRef(false);
  const refetch = useCallback(async () => {
    if (inFlightRef.current || query.isFetching) return undefined;
    inFlightRef.current = true;
    try {
      return await query.refetch();
    } finally {
      inFlightRef.current = false;
    }
  }, [query]);

  const phase: UseAdminOperationsPreviewResult['phase'] = !enabled
    ? 'idle'
    : query.isLoading
      ? 'loading'
      : query.isFetching
        ? 'refreshing'
        : query.isError
          ? 'error'
          : query.data?.status === 'partial' || query.data?.status === 'failed'
            ? 'partial'
            : query.data
              ? 'success'
              : 'idle';

  return {
    data: query.data,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isError: query.isError,
    error: (query.error as Error | null) ?? null,
    refetch,
    fetchedAt: query.dataUpdatedAt || undefined,
    lastSuccessfulAt: lastSuccessfulAtRef.current,
    phase,
  };
}