/**
 * BUSINESS-OPERATIONS-2M — Manual dry-run preview ledger writer.
 *
 * Records a sanitized ledger entry whenever the admin operations
 * dashboard manually generates a dry-run SLA preview. Reuses the
 * existing `public.log_cron_run` SECURITY DEFINER RPC but is clearly
 * labelled as a *manual preview* (distinct `job_name` and `runType`)
 * so it is never confused with the real (future) cron `sla-sweep` run.
 *
 * SAFETY CONTRACT (do not weaken):
 *   - Always logs with `dryRun: true`.
 *   - Never mutates alerts, never sends notifications.
 *   - Only safe metadata in the summary payload:
 *       runType, dryRun, status, totals (whitelisted), loaderErrorsCount,
 *       actionSampleCount, totalActionCount.
 *     Customer names, phones, emails, recipient IDs, idempotency keys,
 *     notification bodies, and raw rows MUST NOT pass through here.
 *   - Never throws — always returns `{ ok, id?, error? }`.
 */
import { supabase } from '@/integrations/supabase/client';
import type { PreviewSlaSweepResult } from './previewSlaSweepForAdmin';

export const MANUAL_PREVIEW_RUN_TYPE = 'sla_manual_preview' as const;
export const MANUAL_PREVIEW_JOB_NAME = 'sla-manual-preview';
export const MANUAL_PREVIEW_FUNCTION_NAME = 'admin-operations-dashboard';

export interface ManualPreviewLedgerTotals {
  candidates: number;
  create: number;
  escalate: number;
  resolve: number;
  skipped: number;
  plannedNotifications: number;
  existingAlerts: number;
}

export interface ManualPreviewLedgerSummary {
  runType: typeof MANUAL_PREVIEW_RUN_TYPE;
  dryRun: true;
  status: 'success' | 'partial' | 'failed' | 'empty';
  totals: ManualPreviewLedgerTotals;
  loaderErrorsCount: number;
  actionSampleCount: number;
  totalActionCount: number;
}

export interface LogManualPreviewInput {
  preview: PreviewSlaSweepResult | null;
  startedAt: string;
  finishedAt: string;
  errorCode?: string | null;
  errorMessage?: string | null;
}

export interface LogManualPreviewResult {
  ok: boolean;
  id?: string;
  error?: string;
}

interface LogCronRunArgs {
  _job_name: string;
  _function_name: string;
  _started_at: string;
  _finished_at: string;
  _ok: boolean;
  _status: string;
  _summary: ManualPreviewLedgerSummary;
  _error_code: string | null;
  _error_message: string | null;
}

export interface LogManualPreviewDeps {
  rpc?: (
    args: LogCronRunArgs,
  ) => Promise<{ data: unknown; error: { message: string } | null }>;
}

const EMPTY_TOTALS: ManualPreviewLedgerTotals = {
  candidates: 0, create: 0, escalate: 0, resolve: 0,
  skipped: 0, plannedNotifications: 0, existingAlerts: 0,
};

const SAFE_TOTALS_KEYS: ReadonlyArray<keyof ManualPreviewLedgerTotals> = [
  'candidates', 'create', 'escalate', 'resolve',
  'skipped', 'plannedNotifications', 'existingAlerts',
];

function pickNumber(v: unknown): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : 0;
}

/** Project the preview onto a sanitized ledger summary. */
export function buildManualPreviewSummary(
  preview: PreviewSlaSweepResult | null,
): ManualPreviewLedgerSummary {
  if (!preview) {
    return {
      runType: MANUAL_PREVIEW_RUN_TYPE,
      dryRun: true,
      status: 'failed',
      totals: { ...EMPTY_TOTALS },
      loaderErrorsCount: 0,
      actionSampleCount: 0,
      totalActionCount: 0,
    };
  }
  const totals = { ...EMPTY_TOTALS };
  for (const k of SAFE_TOTALS_KEYS) {
    totals[k] = pickNumber((preview.totals as Record<string, unknown>)[k]);
  }
  return {
    runType: MANUAL_PREVIEW_RUN_TYPE,
    dryRun: true,
    status: preview.status,
    totals,
    loaderErrorsCount: pickNumber(preview.loaderErrorsCount),
    actionSampleCount: pickNumber(preview.actionSampleCount),
    totalActionCount: pickNumber(preview.totalActionCount),
  };
}

/**
 * Persist a manual dry-run preview ledger entry. Never throws — failures
 * are returned in the envelope so the dashboard can surface them as
 * `ledgerError` without losing the preview itself.
 */
export async function logManualSlaPreviewRun(
  input: LogManualPreviewInput,
  deps: LogManualPreviewDeps = {},
): Promise<LogManualPreviewResult> {
  const summary = buildManualPreviewSummary(input.preview);
  const ok = summary.status !== 'failed';
  const errorCode =
    input.errorCode ?? (summary.status === 'failed' ? 'sla_manual_preview_failed' : null);
  const errorMessage = input.errorMessage ? input.errorMessage.slice(0, 500) : null;

  const rpc =
    deps.rpc ??
    (async (args: LogCronRunArgs) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase.rpc as any)('log_cron_run', args);
      return { data, error };
    });

  try {
    const { data, error } = await rpc({
      _job_name: MANUAL_PREVIEW_JOB_NAME,
      _function_name: MANUAL_PREVIEW_FUNCTION_NAME,
      _started_at: input.startedAt,
      _finished_at: input.finishedAt,
      _ok: ok,
      _status: summary.status,
      _summary: summary,
      _error_code: errorCode,
      _error_message: errorMessage,
    });
    if (error) return { ok: false, error: error.message };
    return { ok: true, id: typeof data === 'string' ? data : undefined };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'unknown manual preview ledger error',
    };
  }
}