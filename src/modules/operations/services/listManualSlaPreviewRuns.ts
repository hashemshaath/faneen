/**
 * BUSINESS-OPERATIONS-2M — Manual dry-run preview ledger reader.
 *
 * Returns a sanitized, capped list of recent manual SLA preview runs
 * from `cron_run_log` (admin-RLS-gated). Strips any unexpected JSON
 * keys from the summary payload and never exposes PII or raw rows.
 */
import { supabase } from '@/integrations/supabase/client';
import {
  MANUAL_PREVIEW_JOB_NAME,
  MANUAL_PREVIEW_RUN_TYPE,
  type ManualPreviewLedgerTotals,
} from './logManualSlaPreviewRun';

export const MANUAL_PREVIEW_RUNS_CAP = 10;

export interface ManualPreviewRunSummary {
  id: string;
  jobName: string;
  startedAt: string;
  finishedAt: string | null;
  ok: boolean | null;
  status: string | null;
  durationMs: number | null;
  errorCode: string | null;
  totals: ManualPreviewLedgerTotals;
  runType: string;
  dryRun: boolean;
  loaderErrorsCount: number;
  actionSampleCount: number;
  totalActionCount: number;
}

export interface ListManualPreviewRunsResult {
  ok: boolean;
  runs: ManualPreviewRunSummary[];
  error?: string;
}

interface CronRunLogRow {
  id: string;
  job_name: string;
  started_at: string;
  finished_at: string | null;
  ok: boolean | null;
  status: string | null;
  duration_ms: number | null;
  error_code: string | null;
  summary: unknown;
}

export interface ListManualPreviewRunsDeps {
  read?: (
    limit: number,
  ) => Promise<{ data: CronRunLogRow[] | null; error: { message: string } | null }>;
}

const EMPTY_TOTALS: ManualPreviewLedgerTotals = {
  candidates: 0, create: 0, escalate: 0, resolve: 0,
  skipped: 0, plannedNotifications: 0, existingAlerts: 0,
};

function pickNumber(v: unknown): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : 0;
}

function sanitizeRow(row: CronRunLogRow): ManualPreviewRunSummary {
  const s =
    row.summary && typeof row.summary === 'object'
      ? (row.summary as Record<string, unknown>)
      : {};
  const t =
    s.totals && typeof s.totals === 'object'
      ? (s.totals as Record<string, unknown>)
      : {};
  return {
    id: row.id,
    jobName: row.job_name,
    startedAt: row.started_at,
    finishedAt: row.finished_at,
    ok: row.ok,
    status: row.status,
    durationMs: row.duration_ms,
    errorCode: row.error_code,
    totals: {
      candidates: pickNumber(t.candidates),
      create: pickNumber(t.create),
      escalate: pickNumber(t.escalate),
      resolve: pickNumber(t.resolve),
      skipped: pickNumber(t.skipped),
      plannedNotifications: pickNumber(t.plannedNotifications),
      existingAlerts: pickNumber(t.existingAlerts),
    },
    runType: typeof s.runType === 'string' ? s.runType : MANUAL_PREVIEW_RUN_TYPE,
    dryRun: s.dryRun === true,
    loaderErrorsCount: pickNumber(s.loaderErrorsCount),
    actionSampleCount: pickNumber(s.actionSampleCount),
    totalActionCount: pickNumber(s.totalActionCount),
  };
}

export async function listManualSlaPreviewRuns(
  limit = MANUAL_PREVIEW_RUNS_CAP,
  deps: ListManualPreviewRunsDeps = {},
): Promise<ListManualPreviewRunsResult> {
  const capped = Math.min(Math.max(limit | 0, 1), MANUAL_PREVIEW_RUNS_CAP);
  const read =
    deps.read ??
    (async (l: number) => {
      const { data, error } = await supabase
        .from('cron_run_log')
        .select(
          'id, job_name, started_at, finished_at, ok, status, duration_ms, error_code, summary',
        )
        .eq('job_name', MANUAL_PREVIEW_JOB_NAME)
        .order('started_at', { ascending: false })
        .limit(l);
      return {
        data: (data as CronRunLogRow[] | null) ?? null,
        error: error ? { message: error.message } : null,
      };
    });
  try {
    const { data, error } = await read(capped);
    if (error) return { ok: false, runs: [], error: error.message };
    const rows = (data ?? []).slice(0, capped).map(sanitizeRow);
    return { ok: true, runs: rows };
  } catch (err) {
    return {
      ok: false,
      runs: [],
      error: err instanceof Error ? err.message : 'unknown manual preview ledger read error',
    };
  }
}