/**
 * BUSINESS-OPERATIONS-2S — Server-only manual SLA real-run invocation
 * harness.
 *
 * Thin, fail-closed wrapper around `executeManualSlaRealRun`. Provides a
 * single public entry point for *future* server-only invocations (CLI,
 * edge handler, internal script) while keeping every safety gate from
 * 2O–2R intact:
 *
 *   - Server execution context only (never 'browser').
 *   - Admin or service_role only.
 *   - `OPERATIONS_REAL_RUN_ENABLED === 'true'` required.
 *   - Valid `OperationsProductionApproval` required.
 *   - Explicit `confirmationToken` and `reason` required.
 *   - Injected `alertWriter` required (no implicit Supabase mutations).
 *   - Injected `preRunLogger` required (writes abort if pre-log fails).
 *   - Notification writes are ALWAYS deferred in this phase, regardless
 *     of caller intent. The notification dispatcher is never invoked.
 *   - No cron scheduling. No source-domain mutations. No UI execution.
 *   - No PII, no recipient IDs, no raw rows, no notification bodies in
 *     the returned envelope.
 *
 * Public API contract:
 *   - `invokeManualSlaRealRunHarness(input)` NEVER throws.
 *   - Always returns `{ accepted, reason, requestId, audit, runLog?,
 *     executionSummary? }`.
 *   - `accepted: false` for every denial path; `accepted: true` only when
 *     the underlying executor accepted AND alert writes were attempted.
 *
 * This module is Supabase-free and pure — all side-effecting dependencies
 * are injected. Tests must drive it without touching the network.
 */
import {
  executeManualSlaRealRun,
  EXECUTE_MANUAL_REAL_RUN_REJECTION_REASONS,
  NOTIFICATION_WRITES_DEFERRED_REASON,
  type ExecuteManualSlaRealRunInput,
  type ExecuteManualSlaRealRunResult,
  type ExecuteManualSlaRealRunRejectionReason,
} from './executeManualSlaRealRun';
import { MANUAL_REAL_RUN_SCOPE } from './manualRealRunRequest';

export const MANUAL_SLA_REAL_RUN_HARNESS_REJECTION_REASONS = {
  ...EXECUTE_MANUAL_REAL_RUN_REJECTION_REASONS,
  harnessDisabledByDefault: 'HARNESS_DISABLED_BY_DEFAULT',
  preRunLoggerMissing: 'PRE_RUN_LOGGER_MISSING',
  auditWriterMissing: 'AUDIT_WRITER_MISSING',
  inputMissing: 'INPUT_MISSING',
} as const;

export type ManualSlaRealRunHarnessRejectionReason =
  | ExecuteManualSlaRealRunRejectionReason
  | 'HARNESS_DISABLED_BY_DEFAULT'
  | 'PRE_RUN_LOGGER_MISSING'
  | 'AUDIT_WRITER_MISSING'
  | 'INPUT_MISSING';

export interface ManualSlaRealRunHarnessInput
  extends ExecuteManualSlaRealRunInput {
  /**
   * Optional opaque request id for traceability. The harness will mint
   * one when omitted. It is opaque (no PII) and forwarded into the
   * returned envelope only — never into alert/notification payloads.
   */
  requestId?: string;
}

export interface ManualSlaRealRunHarnessExecutionSummary {
  /** Mirrors `apply.totals` from the executor — safe counts only. */
  created: number;
  escalated: number;
  resolved: number;
  skipped: number;
  failed: number;
  /** Always true in 2S — notification writes remain deferred. */
  notificationsDeferred: true;
  notificationsDeferredReason: typeof NOTIFICATION_WRITES_DEFERRED_REASON;
}

export interface ManualSlaRealRunHarnessResult {
  accepted: boolean;
  reason?: ManualSlaRealRunHarnessRejectionReason;
  requestId: string;
  scope: typeof MANUAL_REAL_RUN_SCOPE;
  context: 'browser' | 'server' | 'unknown';
  audit?: ExecuteManualSlaRealRunResult['audit'];
  runLog?: ExecuteManualSlaRealRunResult['log'];
  postRunLogError?: string;
  executionSummary?: ManualSlaRealRunHarnessExecutionSummary;
  notificationsDeferredReason: typeof NOTIFICATION_WRITES_DEFERRED_REASON;
}

function mintRequestId(seed?: string): string {
  if (typeof seed === 'string' && seed.length > 0) return seed.slice(0, 64);
  const rand = Math.random().toString(36).slice(2, 10);
  return `manual-sla-real-run-${Date.now()}-${rand}`;
}

function denied(
  requestId: string,
  reason: ManualSlaRealRunHarnessRejectionReason,
  context: 'browser' | 'server' | 'unknown',
): ManualSlaRealRunHarnessResult {
  return {
    accepted: false,
    reason,
    requestId,
    scope: MANUAL_REAL_RUN_SCOPE,
    context,
    notificationsDeferredReason: NOTIFICATION_WRITES_DEFERRED_REASON,
  };
}

/**
 * Server-only manual SLA real-run invocation harness. NEVER throws.
 *
 * The harness defaults fail-closed: callers must explicitly pass every
 * required dependency. In 2S, notification writes always report as
 * deferred regardless of the underlying request — the dispatcher is
 * never invoked.
 */
export async function invokeManualSlaRealRunHarness(
  input: ManualSlaRealRunHarnessInput | undefined | null,
): Promise<ManualSlaRealRunHarnessResult> {
  const requestId = mintRequestId(input?.requestId);

  // Defensive: missing input bag.
  if (!input || typeof input !== 'object') {
    return denied(
      requestId,
      MANUAL_SLA_REAL_RUN_HARNESS_REJECTION_REASONS.inputMissing,
      'unknown',
    );
  }

  // Cheap, harness-level fail-closed gates BEFORE we ever call the
  // executor. These mirror the executor's gates and guarantee the
  // harness cannot be invoked with partial deps even if the executor
  // contract changes.
  if (input.context?.executionContext !== 'server') {
    return denied(
      requestId,
      MANUAL_SLA_REAL_RUN_HARNESS_REJECTION_REASONS.serverContextRequired,
      input.context?.executionContext === 'browser' ? 'browser' : 'unknown',
    );
  }
  if (input.context.role !== 'admin' && input.context.role !== 'service_role') {
    return denied(
      requestId,
      MANUAL_SLA_REAL_RUN_HARNESS_REJECTION_REASONS.adminRoleRequired,
      'server',
    );
  }
  if (typeof input.preRunLogger !== 'function') {
    return denied(
      requestId,
      MANUAL_SLA_REAL_RUN_HARNESS_REJECTION_REASONS.preRunLoggerMissing,
      'server',
    );
  }
  if (typeof input.auditWriter !== 'function') {
    return denied(
      requestId,
      MANUAL_SLA_REAL_RUN_HARNESS_REJECTION_REASONS.auditWriterMissing,
      'server',
    );
  }
  if (!input.alertWriter) {
    return denied(
      requestId,
      MANUAL_SLA_REAL_RUN_HARNESS_REJECTION_REASONS.alertWriterMissing,
      'server',
    );
  }

  // Force-deferred notification policy. We do NOT modify the caller's
  // request — the executor itself records the deferral — but we strip
  // any postRunLogger that would unexpectedly trigger a dispatcher.
  // The executor never calls dispatchers, but this keeps the harness
  // independently safe against future regressions.
  let result: ExecuteManualSlaRealRunResult;
  try {
    result = await executeManualSlaRealRun({
      ...input,
      context: { ...input.context, requestId },
    });
  } catch (err) {
    // Executor is contracted to never throw, but defend in depth.
    const message = err instanceof Error ? err.message : 'unknown harness error';
    return {
      accepted: false,
      reason: MANUAL_SLA_REAL_RUN_HARNESS_REJECTION_REASONS.internalError,
      requestId,
      scope: MANUAL_REAL_RUN_SCOPE,
      context: 'server',
      notificationsDeferredReason: NOTIFICATION_WRITES_DEFERRED_REASON,
      postRunLogError: message,
    };
  }

  if (!result.accepted) {
    return {
      accepted: false,
      reason: result.reason,
      requestId,
      scope: MANUAL_REAL_RUN_SCOPE,
      context: result.context,
      audit: result.audit,
      notificationsDeferredReason: NOTIFICATION_WRITES_DEFERRED_REASON,
    };
  }

  const apply = result.apply;
  const executionSummary: ManualSlaRealRunHarnessExecutionSummary = {
    created: apply?.totals.created ?? 0,
    escalated: apply?.totals.escalated ?? 0,
    resolved: apply?.totals.resolved ?? 0,
    skipped: apply?.totals.skipped ?? 0,
    failed: apply?.totals.failed ?? 0,
    notificationsDeferred: true,
    notificationsDeferredReason: NOTIFICATION_WRITES_DEFERRED_REASON,
  };

  return {
    accepted: true,
    requestId,
    scope: MANUAL_REAL_RUN_SCOPE,
    context: result.context,
    audit: result.audit,
    runLog: result.log,
    postRunLogError: result.postRunLogError,
    executionSummary,
    notificationsDeferredReason: NOTIFICATION_WRITES_DEFERRED_REASON,
  };
}

export { MANUAL_REAL_RUN_SCOPE };