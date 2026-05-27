/**
 * BUSINESS-OPERATIONS-2J — Admin operations dry-run preview hook.
 *
 * Thin React Query wrapper around `previewSlaSweepForAdmin`. Manual
 * refresh only (no polling, no cron). The preview itself is dry-run by
 * construction — this hook never invokes alert writers or notification
 * dispatchers and cannot enable real-run mode.
 */
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

  return {
    data: query.data,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isError: query.isError,
    error: (query.error as Error | null) ?? null,
    refetch: query.refetch,
    fetchedAt: query.dataUpdatedAt || undefined,
  };
}