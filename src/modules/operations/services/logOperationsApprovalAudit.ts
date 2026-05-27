/**
 * BUSINESS-OPERATIONS-2P — Production approval audit log writer.
 *
 * Records a SAFE audit entry for every production-approval check and
 * manual real-run attempt. Reuses the `public.log_cron_run` SECURITY
 * DEFINER RPC with a distinct `job_name`/`function_name` pair so the
 * approval audit stream is never confused with real cron runs or the
 * manual preview ledger.
 *
 * SAFETY CONTRACT (do not weaken):
 *   - Audit entries NEVER enable execution; this writer cannot promote
 *     a rejection into an acceptance.
 *   - Only safe metadata is persisted (eventType, scope, status, reason
 *     code, ticket if safe, opaque requestedBy, dryRun, enableWrites,
 *     enableNotificationWrites, guardReason, generic context).
 *   - Customer names, phones, emails, addresses, recipient IDs, raw
 *     rows, source entity data, notification bodies, idempotency keys,
 *     tokens, and secrets MUST NOT pass through here.
 *   - Never throws — always returns `{ ok, id?, error? }`.
 */
import { supabase } from '@/integrations/supabase/client';

export const OPERATIONS_APPROVAL_AUDIT_JOB_NAME =
  'operations-production-approval' as const;
export const OPERATIONS_APPROVAL_AUDIT_FUNCTION_NAME =
  'operations-approval-audit' as const;

export const OPERATIONS_APPROVAL_AUDIT_EVENTS = {
  approvalChecked: 'production_approval_checked',
  approvalRejected: 'production_approval_rejected',
  manualRealRunRequested: 'manual_real_run_requested',
  manualRealRunRejected: 'manual_real_run_rejected',
  guardDenied: 'guard_denied',
} as const;

export type OperationsApprovalAuditEvent =
  (typeof OPERATIONS_APPROVAL_AUDIT_EVENTS)[keyof typeof OPERATIONS_APPROVAL_AUDIT_EVENTS];

export type OperationsApprovalAuditStatus =
  | 'accepted'
  | 'rejected'
  | 'denied'
  | 'checked';

export interface OperationsApprovalAuditSummary {
  eventType: OperationsApprovalAuditEvent;
  scope: 'manual_sla_real_run';
  status: OperationsApprovalAuditStatus;
  reasonCode: string | null;
  requestedBy: string | null;
  requestedAt: string;
  approvalTicket: string | null;
  expiresAt: string | null;
  dryRun: boolean;
  enableWrites: boolean;
  enableNotificationWrites: boolean;
  guardReason: string | null;
  context: 'browser' | 'server' | 'unknown';
}

export interface LogOperationsApprovalAuditInput {
  eventType: OperationsApprovalAuditEvent;
  scope: 'manual_sla_real_run';
  status: OperationsApprovalAuditStatus;
  reasonCode?: string | null;
  requestedBy?: string | null;
  requestedAt?: string;
  approvalTicket?: string | null;
  expiresAt?: string | null;
  dryRun?: boolean;
  enableWrites?: boolean;
  enableNotificationWrites?: boolean;
  guardReason?: string | null;
  context?: 'browser' | 'server' | 'unknown';
}

export interface LogOperationsApprovalAuditResult {
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
  _summary: OperationsApprovalAuditSummary;
  _error_code: string | null;
  _error_message: string | null;
}

export interface LogOperationsApprovalAuditDeps {
  rpc?: (
    args: LogCronRunArgs,
  ) => Promise<{ data: unknown; error: { message: string } | null }>;
}

/** Hard whitelist — anything outside this set is dropped. */
const SAFE_TICKET_RE = /^[A-Za-z0-9_\-./:]{1,64}$/;
const SAFE_REQUESTED_BY_RE = /^[A-Za-z0-9_\-./:]{1,128}$/;

function safeString(
  v: unknown,
  re: RegExp,
): string | null {
  return typeof v === 'string' && re.test(v) ? v : null;
}

function safeIso(v: unknown): string | null {
  if (typeof v !== 'string') return null;
  const ms = Date.parse(v);
  return Number.isFinite(ms) ? new Date(ms).toISOString() : null;
}

function safeReasonCode(v: unknown): string | null {
  if (typeof v !== 'string') return null;
  const trimmed = v.slice(0, 120);
  // Only allow simple snake/kebab/space tokens so we never leak quoted
  // user data, JSON blobs, or stack traces through reason codes.
  return /^[A-Za-z0-9_\- ]+$/.test(trimmed) ? trimmed : null;
}

function safeGuardReason(v: unknown): string | null {
  if (typeof v !== 'string') return null;
  return v.slice(0, 200);
}

function safeContext(v: unknown): 'browser' | 'server' | 'unknown' {
  return v === 'browser' || v === 'server' ? v : 'unknown';
}

export function buildApprovalAuditSummary(
  input: LogOperationsApprovalAuditInput,
): OperationsApprovalAuditSummary {
  return {
    eventType: input.eventType,
    scope: 'manual_sla_real_run',
    status: input.status,
    reasonCode: safeReasonCode(input.reasonCode),
    requestedBy: safeString(input.requestedBy, SAFE_REQUESTED_BY_RE),
    requestedAt:
      safeIso(input.requestedAt) ?? new Date().toISOString(),
    approvalTicket: safeString(input.approvalTicket, SAFE_TICKET_RE),
    expiresAt: safeIso(input.expiresAt),
    dryRun: input.dryRun === true,
    enableWrites: input.enableWrites === true,
    enableNotificationWrites: input.enableNotificationWrites === true,
    guardReason: safeGuardReason(input.guardReason),
    context: safeContext(input.context),
  };
}

/**
 * Persist a production-approval audit entry. Never throws — failures are
 * returned in the envelope so callers can surface them without blocking.
 * IMPORTANT: a failed audit must NOT enable execution; callers must keep
 * the terminal-deny contract from `requestManualRealRun`.
 */
export async function logOperationsApprovalAudit(
  input: LogOperationsApprovalAuditInput,
  deps: LogOperationsApprovalAuditDeps = {},
): Promise<LogOperationsApprovalAuditResult> {
  const summary = buildApprovalAuditSummary(input);
  const ok = summary.status === 'accepted' || summary.status === 'checked';
  const startedAt = summary.requestedAt;
  const finishedAt = new Date().toISOString();

  const rpc =
    deps.rpc ??
    (async (args: LogCronRunArgs) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase.rpc as any)('log_cron_run', args);
      return { data, error };
    });

  try {
    const { data, error } = await rpc({
      _job_name: OPERATIONS_APPROVAL_AUDIT_JOB_NAME,
      _function_name: OPERATIONS_APPROVAL_AUDIT_FUNCTION_NAME,
      _started_at: startedAt,
      _finished_at: finishedAt,
      _ok: ok,
      _status: summary.status,
      _summary: summary,
      _error_code: summary.reasonCode,
      _error_message: null,
    });
    if (error) return { ok: false, error: error.message };
    return { ok: true, id: typeof data === 'string' ? data : undefined };
  } catch (err) {
    return {
      ok: false,
      error:
        err instanceof Error ? err.message : 'unknown approval audit error',
    };
  }
}