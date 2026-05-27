/**
 * BUSINESS-OPERATIONS-2R — Controlled server-only manual SLA real-run.
 *
 * First phase where alert-write execution can structurally succeed, but
 * ONLY under the full guard chain documented below. Notification writes
 * remain deferred even when requested. Cron, source-domain mutations,
 * and UI execution surfaces stay fully disabled.
 *
 * Guard chain (fail-closed, ordered):
 *   1. Server execution context (never 'browser').
 *   2. Role: 'admin' or 'service_role'.
 *   3. `OPERATIONS_REAL_RUN_ENABLED === 'true'` in the injected env bag.
 *   4. Valid `OperationsProductionApproval` (scope, approved, non-expired).
 *   5. Explicit non-empty `confirmationToken`.
 *   6. Request shape: `dryRun === false` AND `enableWrites === true`.
 *   7. Injected `alertWriter`.
 *   8. Pre-run log succeeds (failure aborts BEFORE any writes).
 *
 * Notification policy: even if `enableNotificationWrites === true`, this
 * phase records `notificationsDeferredReason: 'NOTIFICATION_WRITES_DEFERRED'`
 * and never calls any notification dispatcher / external channel.
 *
 * Idempotency: delegated to `applySlaSweepPlan` + the alert writer's own
 * idempotency_key handling. Repeated executions must not duplicate alerts.
 *
 * Pure module: NO Supabase imports. All side-effecting deps are injected.
 */
import {
  evaluateSlaSweep,
  type SweepCandidate,
  type ExistingAlert,
} from './slaSweep';
import { planNotifications } from './planNotifications';
import {
  applySlaSweepPlan,
  type ApplySlaSweepPlanResult,
  type SweepActionContentBuilder,
} from './applySlaSweepPlan';
import type { AlertWriter } from './alertWriters';
import { detectGuardContext, type OperationsGuardEnv } from './operationsRunGuards';
import {
  MANUAL_REAL_RUN_SCOPE,
  evaluateProductionApproval,
  type ManualRealRunRequest,
  type OperationsProductionApproval,
  type OperationsApprovalAuditWriter,
} from './manualRealRunRequest';
import type { SlaRunLogRecord, SlaRunLogger } from './dispatchSlaSweep';
import type {
  LogOperationsApprovalAuditDeps,
  LogOperationsApprovalAuditInput,
  LogOperationsApprovalAuditResult,
} from './logOperationsApprovalAudit';

export const EXECUTE_MANUAL_REAL_RUN_REJECTION_REASONS = {
  serverContextRequired: 'SERVER_CONTEXT_REQUIRED',
  adminRoleRequired: 'ADMIN_ROLE_REQUIRED',
  realRunFlagDisabled: 'REAL_RUN_FLAG_DISABLED',
  approvalInvalid: 'APPROVAL_INVALID',
  confirmationMissing: 'CONFIRMATION_TOKEN_MISSING',
  reasonMissing: 'REASON_MISSING',
  dryRunMustBeFalse: 'DRY_RUN_MUST_BE_FALSE',
  writesMustBeEnabled: 'WRITES_MUST_BE_ENABLED',
  alertWriterMissing: 'ALERT_WRITER_MISSING',
  preRunLogFailed: 'PRE_RUN_LOG_FAILED',
  internalError: 'INTERNAL_ERROR',
} as const;

export type ExecuteManualSlaRealRunRejectionReason =
  (typeof EXECUTE_MANUAL_REAL_RUN_REJECTION_REASONS)[keyof typeof EXECUTE_MANUAL_REAL_RUN_REJECTION_REASONS];

export const NOTIFICATION_WRITES_DEFERRED_REASON =
  'NOTIFICATION_WRITES_DEFERRED' as const;

export type ExecuteManualSlaRealRunContextRole =
  | 'service_role'
  | 'admin'
  | 'user'
  | 'anonymous';

export interface ExecuteManualSlaRealRunContext {
  executionContext: 'server' | 'browser' | 'test';
  role: ExecuteManualSlaRealRunContextRole;
  requestId?: string;
}

export interface ExecuteManualSlaRealRunInput {
  request: ManualRealRunRequest;
  context: ExecuteManualSlaRealRunContext;
  approval: OperationsProductionApproval;
  candidates: readonly SweepCandidate[];
  existingAlerts: readonly ExistingAlert[];
  alertWriter?: AlertWriter;
  preRunLogger: SlaRunLogger;
  postRunLogger?: SlaRunLogger;
  auditWriter?: OperationsApprovalAuditWriter;
  auditDeps?: LogOperationsApprovalAuditDeps;
  contentBuilder?: SweepActionContentBuilder;
  guardEnv?: OperationsGuardEnv;
  now?: Date;
}

export interface ExecuteManualSlaRealRunResult {
  accepted: boolean;
  reason?: ExecuteManualSlaRealRunRejectionReason;
  /** Always set when `enableNotificationWrites` was requested. */
  notificationsDeferredReason?: typeof NOTIFICATION_WRITES_DEFERRED_REASON;
  context: 'browser' | 'server';
  scope: typeof MANUAL_REAL_RUN_SCOPE;
  apply?: ApplySlaSweepPlanResult;
  log?: SlaRunLogRecord;
  postRunLogError?: string;
  audit?: LogOperationsApprovalAuditResult;
}

const noopAudit: OperationsApprovalAuditWriter = async () => ({
  ok: false,
  error: 'approval audit writer not injected',
});

function readEnv(env: OperationsGuardEnv | undefined): Record<string, string | undefined> {
  if (env?.env) return env.env;
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const p = (globalThis as any).process;
    if (p && typeof p === 'object' && p.env) {
      return p.env as Record<string, string | undefined>;
    }
  } catch {
    /* ignore */
  }
  return {};
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

async function safeAudit(
  writer: OperationsApprovalAuditWriter,
  input: LogOperationsApprovalAuditInput,
  deps?: LogOperationsApprovalAuditDeps,
): Promise<LogOperationsApprovalAuditResult> {
  try {
    return await writer(input, deps);
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'approval audit threw unexpectedly',
    };
  }
}

/**
 * Controlled server-only manual SLA real-run executor. NEVER throws.
 * Returns `accepted: true` only when every gate is satisfied AND the
 * pre-run log succeeds. Alert writes only — notifications are deferred.
 */
export async function executeManualSlaRealRun(
  input: ExecuteManualSlaRealRunInput,
): Promise<ExecuteManualSlaRealRunResult> {
  const startedAt = new Date().toISOString();
  const context = detectGuardContext(
    input.context.executionContext === 'browser' ? 'browser' : 'server',
  );
  const audit = input.auditWriter ?? noopAudit;
  const baseAudit: Omit<
    LogOperationsApprovalAuditInput,
    'eventType' | 'status' | 'reasonCode'
  > = {
    scope: MANUAL_REAL_RUN_SCOPE,
    requestedBy: input.request.requestedBy,
    requestedAt: startedAt,
    approvalTicket: input.approval?.approvalTicket ?? null,
    expiresAt: input.approval?.expiresAt ?? null,
    dryRun: input.request.dryRun === true,
    enableWrites: input.request.enableWrites === true,
    enableNotificationWrites: input.request.enableNotificationWrites === true,
    guardReason: null,
    context,
  };

  const notificationsDeferredReason =
    input.request.enableNotificationWrites === true
      ? NOTIFICATION_WRITES_DEFERRED_REASON
      : undefined;

  const deny = async (
    reason: ExecuteManualSlaRealRunRejectionReason,
    guardReason: string,
  ): Promise<ExecuteManualSlaRealRunResult> => {
    const auditResult = await safeAudit(
      audit,
      {
        ...baseAudit,
        eventType: 'manual_real_run_rejected',
        status: 'rejected',
        reasonCode: reason,
        guardReason,
      },
      input.auditDeps,
    );
    return {
      accepted: false,
      reason,
      notificationsDeferredReason,
      context,
      scope: MANUAL_REAL_RUN_SCOPE,
      audit: auditResult,
    };
  };

  try {
    // 1. Server context (never browser, never test runtime detection failure)
    if (input.context.executionContext !== 'server' || context !== 'server') {
      return await deny(
        EXECUTE_MANUAL_REAL_RUN_REJECTION_REASONS.serverContextRequired,
        'non-server context',
      );
    }
    // 2. Role
    if (
      input.context.role !== 'admin' &&
      input.context.role !== 'service_role'
    ) {
      return await deny(
        EXECUTE_MANUAL_REAL_RUN_REJECTION_REASONS.adminRoleRequired,
        'role not admin/service_role',
      );
    }
    // 3. Feature flag
    const env = readEnv(input.guardEnv);
    if (env.OPERATIONS_REAL_RUN_ENABLED !== 'true') {
      return await deny(
        EXECUTE_MANUAL_REAL_RUN_REJECTION_REASONS.realRunFlagDisabled,
        'OPERATIONS_REAL_RUN_ENABLED not true',
      );
    }
    // 4. Approval
    const approvalCheck = evaluateProductionApproval(input.approval, input.now);
    if (!approvalCheck.valid) {
      return await deny(
        EXECUTE_MANUAL_REAL_RUN_REJECTION_REASONS.approvalInvalid,
        approvalCheck.reason ?? 'approval invalid',
      );
    }
    // 5. Confirmation token
    if (
      !input.request.confirmationToken ||
      typeof input.request.confirmationToken !== 'string'
    ) {
      return await deny(
        EXECUTE_MANUAL_REAL_RUN_REJECTION_REASONS.confirmationMissing,
        'confirmation token missing',
      );
    }
    if (!input.request.reason || typeof input.request.reason !== 'string' || !input.request.reason.trim()) {
      return await deny(
        EXECUTE_MANUAL_REAL_RUN_REJECTION_REASONS.reasonMissing,
        'request reason missing',
      );
    }
    // 6. Request shape
    if (input.request.dryRun !== false) {
      return await deny(
        EXECUTE_MANUAL_REAL_RUN_REJECTION_REASONS.dryRunMustBeFalse,
        'dryRun must be false',
      );
    }
    if (input.request.enableWrites !== true) {
      return await deny(
        EXECUTE_MANUAL_REAL_RUN_REJECTION_REASONS.writesMustBeEnabled,
        'enableWrites must be true',
      );
    }
    // 7. Writer
    if (!input.alertWriter) {
      return await deny(
        EXECUTE_MANUAL_REAL_RUN_REJECTION_REASONS.alertWriterMissing,
        'alert writer missing',
      );
    }

    // 8. Pre-run log — abort BEFORE any writes if it fails.
    const preLog: SlaRunLogRecord = {
      runType: 'sla-sweep',
      dryRun: false,
      phase: 'start',
      startedAt,
      finishedAt: startedAt,
      status: 'ok',
      totals: emptyTotals(input.candidates.length),
    };
    try {
      await input.preRunLogger(preLog);
    } catch (err) {
      const reasonMsg =
        err instanceof Error ? err.message : 'pre-run log failed';
      return await deny(
        EXECUTE_MANUAL_REAL_RUN_REJECTION_REASONS.preRunLogFailed,
        'pre-run log failure: ' + reasonMsg,
      );
    }

    // Plan + apply alert writes only. Notifications are NEVER dispatched.
    const now = input.now ?? new Date();
    const plan = evaluateSlaSweep({
      now,
      candidates: input.candidates,
      existingAlerts: input.existingAlerts,
    });
    const notifications = planNotifications(plan);
    const apply = await applySlaSweepPlan({
      plan,
      writer: input.alertWriter,
      dryRun: false,
      enableWrites: true,
      contentBuilder: input.contentBuilder,
    });

    const finishedAt = new Date().toISOString();
    const finishLog: SlaRunLogRecord = {
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
      error:
        apply.totals.failed > 0
          ? `${apply.totals.failed} write(s) failed`
          : undefined,
    };

    // Post-run log: failure surfaces as logError but does NOT rollback.
    let postRunLogError: string | undefined;
    if (input.postRunLogger) {
      try {
        await input.postRunLogger(finishLog);
      } catch (err) {
        postRunLogError =
          err instanceof Error ? err.message : 'post-run log failed';
      }
    }

    const auditResult = await safeAudit(
      audit,
      {
        ...baseAudit,
        eventType: 'manual_real_run_requested',
        status: 'accepted',
        reasonCode: null,
        guardReason: null,
      },
      input.auditDeps,
    );

    return {
      accepted: true,
      notificationsDeferredReason,
      context,
      scope: MANUAL_REAL_RUN_SCOPE,
      apply,
      log: finishLog,
      postRunLogError,
      audit: auditResult,
    };
  } catch (err) {
    // Public function MUST NEVER throw. Funnel any unexpected error into
    // a structured denial with an audit entry.
    const message = err instanceof Error ? err.message : 'unknown error';
    const auditResult = await safeAudit(
      audit,
      {
        ...baseAudit,
        eventType: 'manual_real_run_rejected',
        status: 'rejected',
        reasonCode: EXECUTE_MANUAL_REAL_RUN_REJECTION_REASONS.internalError,
        guardReason: 'internal error',
      },
      input.auditDeps,
    );
    return {
      accepted: false,
      reason: EXECUTE_MANUAL_REAL_RUN_REJECTION_REASONS.internalError,
      notificationsDeferredReason,
      context,
      scope: MANUAL_REAL_RUN_SCOPE,
      audit: auditResult,
      log: {
        runType: 'sla-sweep',
        dryRun: false,
        startedAt,
        finishedAt: new Date().toISOString(),
        status: 'failed',
        totals: emptyTotals(input.candidates.length),
        error: 'internal error: ' + message,
      },
    };
  }
}