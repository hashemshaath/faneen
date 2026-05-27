/**
 * BUSINESS-OPERATIONS-2J — Admin operations dry-run preview hook.
 *
 * Thin React Query wrapper around `previewSlaSweepForAdmin`. Manual
 * refresh only (no polling, no cron). The preview itself is dry-run by
 * construction — this hook never invokes alert writers or notification
 * dispatchers and cannot enable real-run mode.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  previewSlaSweepForAdmin,
  type PreviewSlaSweepInput,
  type PreviewSlaSweepResult,
} from '../services/previewSlaSweepForAdmin';
import {
  logManualSlaPreviewRun,
  type LogManualPreviewResult,
  type LogManualPreviewDeps,
} from '../services/logManualSlaPreviewRun';
import {
  listManualSlaPreviewRuns,
  MANUAL_PREVIEW_RUNS_CAP,
  type ListManualPreviewRunsDeps,
  type ManualPreviewRunSummary,
} from '../services/listManualSlaPreviewRuns';

export const ADMIN_OPERATIONS_PREVIEW_QUERY_KEY = ['admin', 'operations', 'sla-preview'] as const;

export interface UseAdminOperationsPreviewOptions {
  /** Forwarded as-is to the preview service. */
  sampleLimit?: number;
  /** Persist run log to cron-runs. Defaults to false in the admin UI. */
  persistLog?: boolean;
  /** When false, the query is held back until manually refetched. */
  enabled?: boolean;
  /**
   * BUSINESS-OPERATIONS-2M — when true (default), each successful or
   * failed manual preview generation records a sanitized dry-run ledger
   * entry via `logManualSlaPreviewRun`. Ledger failure never blocks the
   * preview itself; the error surfaces on `ledger.error`.
   */
  logManualRuns?: boolean;
  /** Test-only injection of the ledger writer dependency. */
  ledgerDeps?: LogManualPreviewDeps;
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
  /**
   * BUSINESS-OPERATIONS-2M — outcome of the most recent attempt to write
   * a manual dry-run preview ledger entry. `null` until the first manual
   * generation completes.
   */
  ledger: LogManualPreviewResult | null;
}

export function useAdminOperationsPreview(
  options: UseAdminOperationsPreviewOptions = {},
): UseAdminOperationsPreviewResult {
  const {
    sampleLimit,
    persistLog = false,
    enabled = true,
    logManualRuns = true,
    ledgerDeps,
  } = options;

  // Ledger state lives outside React Query so a logging failure never
  // affects the cached preview data. Tracked via ref + version bump so
  // consumers re-render on each new ledger outcome.
  const ledgerRef = useRef<LogManualPreviewResult | null>(null);
  const [, setLedgerVersion] = useState(0);
  const setLedger = useCallback((res: LogManualPreviewResult) => {
    ledgerRef.current = res;
    setLedgerVersion((v) => v + 1);
  }, []);

  const query = useQuery({
    queryKey: [...ADMIN_OPERATIONS_PREVIEW_QUERY_KEY, { sampleLimit, persistLog }],
    queryFn: async () => {
      const input: PreviewSlaSweepInput = { sampleLimit, persistLog };
      const startedAt = new Date().toISOString();
      try {
        const preview = await previewSlaSweepForAdmin(input);
        const finishedAt = new Date().toISOString();
        if (logManualRuns) {
          const led = await logManualSlaPreviewRun(
            { preview, startedAt, finishedAt },
            ledgerDeps ?? {},
          );
          setLedger(led);
        }
        return preview;
      } catch (err) {
        const finishedAt = new Date().toISOString();
        if (logManualRuns) {
          const message = err instanceof Error ? err.message : 'preview generation failed';
          const led = await logManualSlaPreviewRun(
            {
              preview: null,
              startedAt,
              finishedAt,
              errorCode: 'sla_manual_preview_failed',
              errorMessage: message,
            },
            ledgerDeps ?? {},
          );
          setLedger(led);
        }
        throw err;
      }
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
    ledger: ledgerRef.current,
  };
}

/**
 * BUSINESS-OPERATIONS-2M — Read recent sanitized manual SLA preview
 * ledger entries. Manual-refresh only; no polling.
 */
export const RECENT_MANUAL_PREVIEW_RUNS_QUERY_KEY = [
  'admin', 'operations', 'sla-preview', 'recent-manual-runs',
] as const;

export interface UseRecentManualPreviewRunsOptions {
  limit?: number;
  enabled?: boolean;
  readDeps?: ListManualPreviewRunsDeps;
}

export interface UseRecentManualPreviewRunsResult {
  runs: ManualPreviewRunSummary[];
  isLoading: boolean;
  isFetching: boolean;
  isError: boolean;
  error: Error | null;
  cap: number;
  refetch: () => Promise<unknown>;
}

export function useRecentManualSlaPreviewRuns(
  options: UseRecentManualPreviewRunsOptions = {},
): UseRecentManualPreviewRunsResult {
  const { limit = MANUAL_PREVIEW_RUNS_CAP, enabled = true, readDeps } = options;
  const cap = Math.min(Math.max(limit | 0, 1), MANUAL_PREVIEW_RUNS_CAP);

  const query = useQuery({
    queryKey: [...RECENT_MANUAL_PREVIEW_RUNS_QUERY_KEY, { cap }],
    queryFn: async () => {
      const res = await listManualSlaPreviewRuns(cap, readDeps ?? {});
      if (!res.ok) throw new Error(res.error ?? 'failed to load manual preview runs');
      return res.runs;
    },
    enabled,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchInterval: false,
    staleTime: 60_000,
    retry: 0,
  });

  return {
    runs: query.data ?? [],
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isError: query.isError,
    error: (query.error as Error | null) ?? null,
    cap,
    refetch: () => query.refetch(),
  };
}