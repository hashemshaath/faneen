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

export interface DispatchSlaSweepInput {
  now?: Date;
  candidates: readonly SweepCandidate[];
  existingAlerts: readonly ExistingAlert[];
  /** Defaults to true. Non-dry-run mode is not yet implemented. */
  dryRun?: boolean;
  /** Optional run-log sink. Failures are caught and surfaced as logError. */
  logger?: SlaRunLogger;
}

export interface SlaRunLogRecord {
  runType: 'sla-sweep';
  dryRun: boolean;
  startedAt: string;
  finishedAt: string;
  status: 'ok' | 'failed';
  totals: {
    candidates: number;
    create: number;
    escalate: number;
    resolve: number;
    skipped: number;
    plannedNotifications: number;
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
}

export const NON_DRY_RUN_NOT_ENABLED =
  'non-dry-run not enabled: SLA dispatch write wrappers are not implemented yet (phase 2D foundation)';

export async function dispatchSlaSweep(
  input: DispatchSlaSweepInput,
): Promise<DispatchSlaSweepResult> {
  const startedAt = new Date().toISOString();
  const dryRun = input.dryRun ?? true;

  // Safety: fail closed for any non-dry-run request.
  if (!dryRun) {
    const finishedAt = new Date().toISOString();
    const log: SlaRunLogRecord = {
      runType: 'sla-sweep',
      dryRun: false,
      startedAt,
      finishedAt,
      status: 'failed',
      totals: {
        candidates: input.candidates.length,
        create: 0,
        escalate: 0,
        resolve: 0,
        skipped: 0,
        plannedNotifications: 0,
      },
      error: NON_DRY_RUN_NOT_ENABLED,
    };
    const logError = await safeLog(input.logger, log);
    return { plan: null, notifications: null, log, logError };
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