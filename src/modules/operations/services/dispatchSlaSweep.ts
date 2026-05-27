/**
 * BUSINESS-OPERATIONS-2D — SLA dispatch orchestrator (dry-run foundation).
 *
 * Responsibilities:
 *   - Accept candidate + existing alert snapshots.
 *   - Run the pure `evaluateSlaSweep` planner.
 *   - Run `planNotifications` to describe what would be notified.
 *   - Emit a structured run-log record via an injectable logger.
 *
 * Safety guarantees (this phase):
 *   - Default mode is dry-run.
 *   - Non-dry-run mode FAILS CLOSED: no write wrappers are wired yet, so
 *     any caller passing `{ dryRun: false }` gets an error and the run
 *     log records `status: 'failed'` with `error: 'non-dry-run not enabled'`.
 *   - Logger failures NEVER mutate alerts or send notifications — they
 *     surface only via the returned record's `logError` field.
 *   - No Supabase imports here; pure orchestration over pure planners.
 */
import {
  evaluateSlaSweep,
  type SweepCandidate,
  type ExistingAlert,
  type SweepPlan,
} from './slaSweep';
import {
  planNotifications,
  type NotificationPlan,
} from './planNotifications';
import {
  applySlaSweepPlan,
  type ApplySlaSweepPlanResult,
  type SweepActionContentBuilder,
} from './applySlaSweepPlan';
import type { AlertWriter } from './alertWriters';

export interface DispatchSlaSweepInput {
  now?: Date;
  candidates: readonly SweepCandidate[];
  existingAlerts: readonly ExistingAlert[];
  /** Defaults to true. Non-dry-run mode is not yet implemented. */
  dryRun?: boolean;
  /** Hard gate required (with dryRun:false + writer) to perform any writes. */
  enableWrites?: boolean;
  /** Required when dryRun:false. Injectable for tests. */
  writer?: AlertWriter;
  /** Optional sweep action → alert content mapper. */
  contentBuilder?: SweepActionContentBuilder;
  /** Optional run-log sink. Failures are caught and surfaced as logError. */
  logger?: SlaRunLogger;
}

export interface SlaRunLogRecord {
  runType: 'sla-sweep';
  dryRun: boolean;
  startedAt: string;
  finishedAt: string;
  status: 'ok' | 'failed';
  /** 'start' is emitted for non-dry-run runs before any writes. */
  phase?: 'start' | 'finish';
  totals: {
    candidates: number;
    create: number;
    escalate: number;
    resolve: number;
    skipped: number;
    plannedNotifications: number;
    created?: number;
    escalated?: number;
    resolved?: number;
    skippedWrites?: number;
    failedWrites?: number;
  };
  error?: string;
}

export type SlaRunLogger = (record: SlaRunLogRecord) => void | Promise<void>;

export interface DispatchSlaSweepResult {
  plan: SweepPlan | null;
  notifications: NotificationPlan | null;
  log: SlaRunLogRecord;
  /** Captured (but non-fatal) logger error message, if any. */
  logError?: string;
  /** Present only when non-dry-run writes ran. */
  apply?: ApplySlaSweepPlanResult;
}

export const NON_DRY_RUN_NOT_ENABLED =
  'non-dry-run not enabled: SLA dispatch write wrappers are not implemented yet (phase 2D foundation)';
export const NON_DRY_RUN_REQUIRES_WRITER =
  'non-dry-run requires an injected AlertWriter';
export const NON_DRY_RUN_REQUIRES_ENABLE_WRITES =
  'non-dry-run requires enableWrites:true';

export async function dispatchSlaSweep(
  input: DispatchSlaSweepInput,
): Promise<DispatchSlaSweepResult> {
  const startedAt = new Date().toISOString();
  const dryRun = input.dryRun ?? true;

  // Safety: fail closed for any non-dry-run request without explicit writer
  // + enableWrites. We deliberately reuse NON_DRY_RUN_NOT_ENABLED as the
  // outward error so older callers see the same fail-closed shape.
  if (!dryRun) {
    if (!input.writer || input.enableWrites !== true) {
      const finishedAt = new Date().toISOString();
      const log: SlaRunLogRecord = {
        runType: 'sla-sweep',
        dryRun: false,
        startedAt,
        finishedAt,
        status: 'failed',
        totals: emptyTotals(input.candidates.length),
        error: NON_DRY_RUN_NOT_ENABLED,
      };
      const logError = await safeLog(input.logger, log);
      return { plan: null, notifications: null, log, logError };
    }
    return runNonDryRun(input, startedAt);
  }

  const now = input.now ?? new Date();
  const plan = evaluateSlaSweep({
    now,
    candidates: input.candidates,
    existingAlerts: input.existingAlerts,
  });
  const notifications = planNotifications(plan);

  const finishedAt = new Date().toISOString();
  const log: SlaRunLogRecord = {
    runType: 'sla-sweep',
    dryRun: true,
    startedAt,
    finishedAt,
    status: 'ok',
    totals: {
      candidates: plan.totals.candidates,
      create: plan.totals.create,
      escalate: plan.totals.escalate,
      resolve: plan.totals.resolve,
      skipped: plan.totals.skipped,
      plannedNotifications: notifications.totals.planned,
    },
  };

  const logError = await safeLog(input.logger, log);
  return { plan, notifications, log, logError };
}

function emptyTotals(candidates: number): SlaRunLogRecord['totals'] {
  return {
    candidates,
    create: 0,
    escalate: 0,
    resolve: 0,
    skipped: 0,
    plannedNotifications: 0,
  };
}

async function runNonDryRun(
  input: DispatchSlaSweepInput,
  startedAt: string,
): Promise<DispatchSlaSweepResult> {
  const now = input.now ?? new Date();

  // Pre-run log: any failure aborts before writes.
  const startLog: SlaRunLogRecord = {
    runType: 'sla-sweep',
    dryRun: false,
    phase: 'start',
    startedAt,
    finishedAt: startedAt,
    status: 'ok',
    totals: emptyTotals(input.candidates.length),
  };
  if (input.logger) {
    try {
      await input.logger(startLog);
    } catch (err) {
      const finishedAt = new Date().toISOString();
      const log: SlaRunLogRecord = {
        ...startLog,
        phase: 'finish',
        finishedAt,
        status: 'failed',
        error: 'pre-run log failure: ' +
          (err instanceof Error ? err.message : 'unknown'),
      };
      return { plan: null, notifications: null, log, logError: log.error };
    }
  }

  const plan = evaluateSlaSweep({
    now,
    candidates: input.candidates,
    existingAlerts: input.existingAlerts,
  });
  const notifications = planNotifications(plan);
  // Writer + enableWrites already validated by caller.
  const apply = await applySlaSweepPlan({
    plan,
    writer: input.writer!,
    dryRun: false,
    enableWrites: true,
    contentBuilder: input.contentBuilder,
  });

  const finishedAt = new Date().toISOString();
  const log: SlaRunLogRecord = {
    runType: 'sla-sweep',
    dryRun: false,
    phase: 'finish',
    startedAt,
    finishedAt,
    status: apply.totals.failed > 0 ? 'failed' : 'ok',
    totals: {
      candidates: plan.totals.candidates,
      create: plan.totals.create,
      escalate: plan.totals.escalate,
      resolve: plan.totals.resolve,
      skipped: plan.totals.skipped,
      plannedNotifications: notifications.totals.planned,
      created: apply.totals.created,
      escalated: apply.totals.escalated,
      resolved: apply.totals.resolved,
      skippedWrites: apply.totals.skipped,
      failedWrites: apply.totals.failed,
    },
    error: apply.totals.failed > 0 ? `${apply.totals.failed} write(s) failed` : undefined,
  };

  const logError = await safeLog(input.logger, log);
  return { plan, notifications, log, logError, apply };
}

async function safeLog(
  logger: SlaRunLogger | undefined,
  record: SlaRunLogRecord,
): Promise<string | undefined> {
  if (!logger) return undefined;
  try {
    await logger(record);
    return undefined;
  } catch (err) {
    return err instanceof Error ? err.message : 'unknown logger error';
  }
}