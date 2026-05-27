/**
 * BUSINESS-OPERATIONS-2Q — Server-only manual real-run endpoint contract.
 *
 * Defines the future request/response/guard-chain shape for the server-
 * side manual real-run execution endpoint. The endpoint is DESIGNED and
 * DISABLED in this phase: every call returns `accepted: false` with
 * `reason: 'ENDPOINT_DISABLED'` regardless of inputs.
 *
 * Required future guard chain (documented here as the canonical contract):
 *   1. Server execution context (never 'browser' / never 'test').
 *   2. Admin or service_role identity (never 'user' / never 'anonymous').
 *   3. All three feature flags enabled (real-run, notification-writes,
 *      cron remain independently gated and OFF by default).
 *   4. Explicit operator `confirmationToken`.
 *   5. Non-empty operator `reason`.
 *   6. Valid `OperationsProductionApproval` (scope, approved, ticket,
 *      non-expired `expiresAt`).
 *   7. `dryRun === false` AND `enableWrites === true`.
 *   8. Approval audit log entry written BEFORE any side effects.
 *   9. Pre-run cron_run_log entry written via SECURITY DEFINER RPC.
 *  10. Injected alert writer (no implicit Supabase mutations).
 *  11. Injected notification dispatcher (only when
 *      `enableNotificationWrites === true`, server-only).
 *  12. Idempotency key per (run-id, condition, entity).
 *  13. Post-run cron_run_log entry recording outcome + sanitized totals.
 *
 * Phase 2Q contract: this module ALWAYS returns
 *   { accepted: false, reason: 'ENDPOINT_DISABLED' }
 * regardless of inputs. It is safe to import from tests and pure code; it
 * does NOT call alert writers, notification dispatchers, dispatchSlaSweep,
 * cron schedulers, or any source-domain mutations. Audit logging is
 * delegated to an injected writer (the 2P approval audit logger).
 */

import type {
  OperationsProductionApproval,
  ManualRealRunRejectionReason,
} from './manualRealRunRequest';
import { MANUAL_REAL_RUN_SCOPE } from './manualRealRunRequest';
import type {
  LogOperationsApprovalAuditDeps,
  LogOperationsApprovalAuditInput,
  LogOperationsApprovalAuditResult,
} from './logOperationsApprovalAudit';

export const MANUAL_REAL_RUN_ENDPOINT_DISABLED_REASON =
  'ENDPOINT_DISABLED' as const;

export const MANUAL_REAL_RUN_ENDPOINT_REJECTION_REASONS = {
  endpointDisabled: 'ENDPOINT_DISABLED',
  serverContextRequired: 'SERVER_CONTEXT_REQUIRED',
  adminRoleRequired: 'ADMIN_ROLE_REQUIRED',
  confirmationMissing: 'CONFIRMATION_TOKEN_MISSING',
  reasonMissing: 'REASON_MISSING',
  approvalMissing: 'APPROVAL_MISSING',
  approvalInvalid: 'APPROVAL_INVALID',
  dryRunMustBeFalse: 'DRY_RUN_MUST_BE_FALSE',
  writesMustBeEnabled: 'WRITES_MUST_BE_ENABLED',
} as const;

export type ManualRealRunEndpointRejectionReason =
  (typeof MANUAL_REAL_RUN_ENDPOINT_REJECTION_REASONS)[keyof typeof MANUAL_REAL_RUN_ENDPOINT_REJECTION_REASONS];

export type ManualRealRunEndpointContextRole =
  | 'service_role'
  | 'admin'
  | 'user'
  | 'anonymous';

export type ManualRealRunEndpointExecutionContext =
  | 'server'
  | 'browser'
  | 'test';

export type ManualRealRunEndpointSource =
  | 'admin_dashboard'
  | 'server_job'
  | 'test';

export interface ManualRealRunEndpointContext {
  executionContext: ManualRealRunEndpointExecutionContext;
  role: ManualRealRunEndpointContextRole;
  requestId?: string;
  source?: ManualRealRunEndpointSource;
}

export interface ManualRealRunEndpointRequest {
  requestedBy: string;
  reason: string;
  confirmationToken: string;
  dryRun: boolean;
  enableWrites: boolean;
  enableNotificationWrites?: boolean;
  productionApproval?: OperationsProductionApproval;
}

export interface ManualRealRunEndpointResponse {
  accepted: false;
  reason: ManualRealRunEndpointRejectionReason | ManualRealRunRejectionReason;
  /** Sanitized echo only — NEVER the raw request body. */
  context: {
    executionContext: ManualRealRunEndpointExecutionContext;
    role: ManualRealRunEndpointContextRole;
    source: ManualRealRunEndpointSource | null;
  };
  requestId: string | null;
  scope: typeof MANUAL_REAL_RUN_SCOPE;
  audit?: LogOperationsApprovalAuditResult;
}

export type ManualRealRunEndpointAuditWriter = (
  input: LogOperationsApprovalAuditInput,
  deps?: LogOperationsApprovalAuditDeps,
) => Promise<LogOperationsApprovalAuditResult>;

export interface ManualRealRunEndpointDeps {
  /** Optional 2P audit writer. Defaults to a safe no-op. */
  logAudit?: ManualRealRunEndpointAuditWriter;
  auditDeps?: LogOperationsApprovalAuditDeps;
}

const noopAudit: ManualRealRunEndpointAuditWriter = async () => ({
  ok: false,
  error: 'endpoint audit writer not injected',
});

/**
 * Pure structural validator. Returns the first failing reason in the
 * documented guard-chain order, or `null` if every structural check
 * passes. Used both by the (always-disabled) endpoint and by tests so
 * the contract can be exercised without ever enabling execution.
 */
export function validateManualRealRunEndpointRequest(
  request: ManualRealRunEndpointRequest,
  context: ManualRealRunEndpointContext,
): ManualRealRunEndpointRejectionReason | null {
  if (context.executionContext !== 'server') {
    return MANUAL_REAL_RUN_ENDPOINT_REJECTION_REASONS.serverContextRequired;
  }
  if (context.role !== 'admin' && context.role !== 'service_role') {
    return MANUAL_REAL_RUN_ENDPOINT_REJECTION_REASONS.adminRoleRequired;
  }
  if (
    !request.confirmationToken ||
    typeof request.confirmationToken !== 'string'
  ) {
    return MANUAL_REAL_RUN_ENDPOINT_REJECTION_REASONS.confirmationMissing;
  }
  if (!request.reason || typeof request.reason !== 'string' || !request.reason.trim()) {
    return MANUAL_REAL_RUN_ENDPOINT_REJECTION_REASONS.reasonMissing;
  }
  if (!request.productionApproval) {
    return MANUAL_REAL_RUN_ENDPOINT_REJECTION_REASONS.approvalMissing;
  }
  if (
    request.productionApproval.approved !== true ||
    request.productionApproval.scope !== MANUAL_REAL_RUN_SCOPE
  ) {
    return MANUAL_REAL_RUN_ENDPOINT_REJECTION_REASONS.approvalInvalid;
  }
  if (request.dryRun !== false) {
    return MANUAL_REAL_RUN_ENDPOINT_REJECTION_REASONS.dryRunMustBeFalse;
  }
  if (request.enableWrites !== true) {
    return MANUAL_REAL_RUN_ENDPOINT_REJECTION_REASONS.writesMustBeEnabled;
  }
  return null;
}

function sanitizeContext(
  context: ManualRealRunEndpointContext,
): ManualRealRunEndpointResponse['context'] {
  return {
    executionContext: context.executionContext,
    role: context.role,
    source: context.source ?? null,
  };
}

/**
 * Server-only manual real-run endpoint. ALWAYS rejected in phase 2Q.
 *
 * Even when structural validation would pass, this function returns
 * `accepted: false` with `reason: 'ENDPOINT_DISABLED'`. The structural
 * validator runs first only so that observability/audit can record the
 * most specific guard-chain reason; it never promotes a request to
 * acceptance.
 */
export async function handleManualRealRunEndpoint(
  request: ManualRealRunEndpointRequest,
  context: ManualRealRunEndpointContext,
  deps: ManualRealRunEndpointDeps = {},
): Promise<ManualRealRunEndpointResponse> {
  const logAudit = deps.logAudit ?? noopAudit;
  const requestId = context.requestId ?? null;
  const sanitizedContext = sanitizeContext(context);
  const structural = validateManualRealRunEndpointRequest(request, context);

  // Phase 2Q terminal deny: regardless of structural validity, the
  // endpoint is disabled. Audit the most specific reason for traceability.
  const reason: ManualRealRunEndpointRejectionReason =
    structural ?? MANUAL_REAL_RUN_ENDPOINT_REJECTION_REASONS.endpointDisabled;

  const audit = await safeAudit(logAudit, {
    eventType: 'manual_real_run_rejected',
    scope: MANUAL_REAL_RUN_SCOPE,
    status: 'rejected',
    reasonCode: reason,
    requestedBy: request.requestedBy,
    requestedAt: new Date().toISOString(),
    approvalTicket: request.productionApproval?.approvalTicket ?? null,
    expiresAt: request.productionApproval?.expiresAt ?? null,
    dryRun: request.dryRun === true,
    enableWrites: request.enableWrites === true,
    enableNotificationWrites: request.enableNotificationWrites === true,
    guardReason: structural ?? 'endpoint disabled',
    context: context.executionContext === 'browser' ? 'browser' : 'server',
  }, deps.auditDeps);

  return {
    accepted: false,
    reason,
    context: sanitizedContext,
    requestId,
    scope: MANUAL_REAL_RUN_SCOPE,
    audit,
  };
}

async function safeAudit(
  logAudit: ManualRealRunEndpointAuditWriter,
  input: LogOperationsApprovalAuditInput,
  auditDeps?: LogOperationsApprovalAuditDeps,
): Promise<LogOperationsApprovalAuditResult> {
  try {
    return await logAudit(input, auditDeps);
  } catch (err) {
    return {
      ok: false,
      error:
        err instanceof Error ? err.message : 'endpoint audit threw unexpectedly',
    };
  }
}