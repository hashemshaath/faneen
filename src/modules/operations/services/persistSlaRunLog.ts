/**
 * BUSINESS-OPERATIONS-2E — Safe SLA run-log persistence wrapper.
 *
 * Wraps the existing `public.log_cron_run` SECURITY DEFINER RPC introduced
 * in EDGE-CRON-OBSERVABILITY-1. This is the ONLY app-side write path for
 * SLA sweep run logs. It performs three jobs:
 *
 *   1. Builds a sanitized `summary` payload from a `SlaRunLogRecord` —
 *      only operational metadata (totals, run type, dry-run flag).
 *   2. Calls `log_cron_run` (which itself strips secret-like keys and
 *      truncates `error_message` to 500 chars).
 *   3. Returns a normalized `{ ok, id?, error? }` envelope; never throws.
 *
 * Authentication: `log_cron_run` is EXECUTE-restricted to `service_role`.
 * From the browser/anon/authenticated client this call will fail with a
 * permission error and that error surfaces as `logError` in the dispatch
 * result. No alerts are mutated and no notifications are sent on failure.
 *
 * PII contract: the only fields ever sent are `runType`, `dryRun`,
 * timestamps, integer totals, and (optionally) a short error code/message.
 * Customer names, phones, emails, lead/contract content, payment content,
 * and notification bodies MUST NOT pass through this wrapper.
 */
import { supabase } from '@/integrations/supabase/client';
import type { SlaRunLogRecord, SlaRunLogger } from './dispatchSlaSweep';

export const SLA_RUN_LOG_JOB_NAME = 'sla-sweep';
export const SLA_RUN_LOG_FUNCTION_NAME = 'sla-sweep-dispatcher';

/** Strictly the keys that may appear in the `summary` jsonb column. */
const SAFE_TOTALS_KEYS = [
  'candidates',
  'create',
  'escalate',
  'resolve',
  'skipped',
  'plannedNotifications',
] as const;

export interface SafeRunLogSummary {
  runType: 'sla-sweep';
  dryRun: boolean;
  totals: {
    candidates: number;
    create: number;
    escalate: number;
    resolve: number;
    skipped: number;
    plannedNotifications: number;
  };
}

export interface PersistSlaRunLogResult {
  ok: boolean;
  id?: string;
  error?: string;
}

/**
 * Project the in-memory run record onto a sanitized summary payload.
 * Only whitelisted, non-PII fields survive.
 */
export function buildSafeRunLogSummary(
  record: SlaRunLogRecord,
): SafeRunLogSummary {
  const t = record.totals ?? {
    candidates: 0,
    create: 0,
    escalate: 0,
    resolve: 0,
    skipped: 0,
    plannedNotifications: 0,
  };
  const totals = {} as SafeRunLogSummary['totals'];
  for (const k of SAFE_TOTALS_KEYS) {
    const v = (t as Record<string, unknown>)[k];
    (totals as Record<string, number>)[k] = typeof v === 'number' && Number.isFinite(v) ? v : 0;
  }
  return {
    runType: 'sla-sweep',
    dryRun: Boolean(record.dryRun),
    totals,
  };
}

export interface PersistSlaRunLogDeps {
  /** Injectable RPC caller for unit tests. Defaults to the supabase client. */
  rpc?: (
    fn: 'log_cron_run',
    args: Record<string, unknown>,
  ) => Promise<{ data: unknown; error: { message: string } | null }>;
}

function deriveErrorCode(record: SlaRunLogRecord): string | null {
  if (record.status === 'failed') return record.error ? 'sla_sweep_failed' : 'sla_sweep_failed_unknown';
  return null;
}

/**
 * Persist an SLA run log record. Never throws — failures are returned in
 * the result envelope so the orchestrator can surface them as `logError`.
 */
export async function persistSlaRunLog(
  record: SlaRunLogRecord,
  deps: PersistSlaRunLogDeps = {},
): Promise<PersistSlaRunLogResult> {
  const rpc = deps.rpc ?? ((fn, args) => supabase.rpc(fn, args) as ReturnType<NonNullable<PersistSlaRunLogDeps['rpc']>>);
  const summary = buildSafeRunLogSummary(record);
  const errorCode = deriveErrorCode(record);
  const errorMessage = record.status === 'failed' ? (record.error ?? null) : null;
  try {
    const { data, error } = await rpc('log_cron_run', {
      _job_name: SLA_RUN_LOG_JOB_NAME,
      _function_name: SLA_RUN_LOG_FUNCTION_NAME,
      _started_at: record.startedAt,
      _finished_at: record.finishedAt,
      _ok: record.status === 'ok',
      _status: record.status,
      _summary: summary,
      _error_code: errorCode,
      _error_message: errorMessage,
    });
    if (error) return { ok: false, error: error.message };
    return { ok: true, id: typeof data === 'string' ? data : undefined };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'unknown persist error' };
  }
}

/**
 * Build a `SlaRunLogger` callable suitable for `dispatchSlaSweep({ logger })`.
 * Logger failures throw — the dispatcher catches and surfaces them as
 * `logError` (and never mutates alerts on logger failure).
 */
export function createSupabaseSlaRunLogger(
  deps: PersistSlaRunLogDeps = {},
): SlaRunLogger {
  return async (record) => {
    const res = await persistSlaRunLog(record, deps);
    if (!res.ok) throw new Error(res.error ?? 'sla run-log persistence failed');
  };
}