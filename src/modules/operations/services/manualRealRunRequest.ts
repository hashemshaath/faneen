/**
 * BUSINESS-OPERATIONS-2O — Server-only manual real-run skeleton (DISABLED).
 *
 * Future activation requirements (documented here as the canonical contract):
 *   1. Server-only execution context (never browser/window).
 *   2. All three feature flags enabled (real-run, notification writes, cron
 *      remain independently gated and OFF by default).
 *   3. A valid `OperationsProductionApproval` object with:
 *        - approved: true
 *        - scope: 'manual_sla_real_run'
 *        - approvedBy + approvedAt
 *        - non-expired expiresAt
 *        - approvalTicket reference
 *   4. Explicit `confirmationToken` provided by the operator.
 *   5. Injected alert writer (no implicit Supabase mutations).
 *   6. Injected notification dispatcher (no implicit channel writes).
 *   7. Audit ledger logging (`logManualSlaPreviewRun`-equivalent for real
 *      runs) wired by the caller.
 *   8. NO direct UI mutation path — UI may surface request status only.
 *
 * Phase 2O contract: this module ALWAYS returns
 *   { accepted: false, reason: 'PRODUCTION_APPROVAL_REQUIRED' }
 * regardless of inputs. It is safe to import from tests and pure code; it
 * does NOT call alert writers, notification dispatchers, dispatchSlaSweep,
 * cron schedulers, or source-domain mutations.
 */

import {
  checkOperationsRealRunAllowed,
  detectGuardContext,
  type OperationsGuardEnv,
  type OperationsGuardResult,
} from './operationsRunGuards';

export const MANUAL_REAL_RUN_SCOPE = 'manual_sla_real_run' as const;

export const MANUAL_REAL_RUN_REJECTION_REASONS = {
  productionApprovalRequired: 'PRODUCTION_APPROVAL_REQUIRED',
  browserContext: 'BROWSER_CONTEXT_FORBIDDEN',
  guardDenied: 'GUARD_DENIED',
  approvalMissing: 'APPROVAL_MISSING',
  approvalNotApproved: 'APPROVAL_NOT_APPROVED',
  approvalWrongScope: 'APPROVAL_WRONG_SCOPE',
  approvalExpired: 'APPROVAL_EXPIRED',
  approvalMalformed: 'APPROVAL_MALFORMED',
  confirmationMissing: 'CONFIRMATION_TOKEN_MISSING',
} as const;

export type ManualRealRunRejectionReason =
  (typeof MANUAL_REAL_RUN_REJECTION_REASONS)[keyof typeof MANUAL_REAL_RUN_REJECTION_REASONS];

export interface OperationsProductionApproval {
  approved: boolean;
  approvedBy?: string;
  approvedAt?: string;
  approvalTicket?: string;
  scope: typeof MANUAL_REAL_RUN_SCOPE;
  expiresAt?: string;
}

export interface ManualRealRunRequest {
  requestedBy: string;
  confirmationToken: string;
  reason: string;
  dryRun: boolean;
  enableWrites: boolean;
  enableNotificationWrites: boolean;
  approval?: OperationsProductionApproval;
  guardEnv?: OperationsGuardEnv;
}

export interface ManualRealRunResult {
  accepted: false;
  reason: ManualRealRunRejectionReason;
  guard?: OperationsGuardResult;
  context: 'browser' | 'server';
  scope: typeof MANUAL_REAL_RUN_SCOPE;
}

/**
 * Pure validator for an `OperationsProductionApproval`. Fail-closed for any
 * missing/malformed/expired/wrong-scope input. Never throws.
 */
export function evaluateProductionApproval(
  approval: OperationsProductionApproval | undefined,
  now: Date = new Date(),
): { valid: boolean; reason?: ManualRealRunRejectionReason } {
  if (!approval || typeof approval !== 'object') {
    return { valid: false, reason: MANUAL_REAL_RUN_REJECTION_REASONS.approvalMissing };
  }
  if (typeof approval.approved !== 'boolean') {
    return { valid: false, reason: MANUAL_REAL_RUN_REJECTION_REASONS.approvalMalformed };
  }
  if (approval.approved !== true) {
    return { valid: false, reason: MANUAL_REAL_RUN_REJECTION_REASONS.approvalNotApproved };
  }
  if (approval.scope !== MANUAL_REAL_RUN_SCOPE) {
    return { valid: false, reason: MANUAL_REAL_RUN_REJECTION_REASONS.approvalWrongScope };
  }
  if (approval.expiresAt) {
    const exp = Date.parse(approval.expiresAt);
    if (Number.isNaN(exp)) {
      return { valid: false, reason: MANUAL_REAL_RUN_REJECTION_REASONS.approvalMalformed };
    }
    if (exp <= now.getTime()) {
      return { valid: false, reason: MANUAL_REAL_RUN_REJECTION_REASONS.approvalExpired };
    }
  }
  return { valid: true };
}

/**
 * Phase 2O server-only manual real-run request. ALWAYS rejected.
 *
 * Even when guard + approval + confirmation all line up, this function still
 * returns `accepted: false` with `PRODUCTION_APPROVAL_REQUIRED`. The path to
 * `accepted: true` is intentionally NOT implemented in this phase — that is
 * the explicit production-approval phase's job.
 */
export async function requestManualRealRun(
  request: ManualRealRunRequest,
): Promise<ManualRealRunResult> {
  const context = detectGuardContext(request.guardEnv?.context);

  // Browser context can never request real-run, even structurally.
  if (context === 'browser') {
    return {
      accepted: false,
      reason: MANUAL_REAL_RUN_REJECTION_REASONS.browserContext,
      context,
      scope: MANUAL_REAL_RUN_SCOPE,
    };
  }

  // Compute (but do not act on) the guard + approval + confirmation state so
  // tests can verify the structural reasoning without ever enabling execution.
  const guard = checkOperationsRealRunAllowed({
    ...(request.guardEnv ?? {}),
    confirmationToken: request.confirmationToken,
  });

  if (!request.confirmationToken || typeof request.confirmationToken !== 'string') {
    return {
      accepted: false,
      reason: MANUAL_REAL_RUN_REJECTION_REASONS.confirmationMissing,
      guard,
      context,
      scope: MANUAL_REAL_RUN_SCOPE,
    };
  }

  const approvalCheck = evaluateProductionApproval(request.approval);
  if (!approvalCheck.valid) {
    return {
      accepted: false,
      reason: approvalCheck.reason!,
      guard,
      context,
      scope: MANUAL_REAL_RUN_SCOPE,
    };
  }

  // Final structural deny. Phase 2O does NOT activate real-run under any
 // circumstance. The pathway is designed and disabled.
  return {
    accepted: false,
    reason: MANUAL_REAL_RUN_REJECTION_REASONS.productionApprovalRequired,
    guard,
    context,
    scope: MANUAL_REAL_RUN_SCOPE,
  };
}