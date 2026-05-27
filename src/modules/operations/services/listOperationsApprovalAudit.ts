/**
 * BUSINESS-OPERATIONS-2P — Production approval audit reader.
 *
 * Returns a sanitized, capped list of recent approval-audit entries from
 * `cron_run_log` (admin-RLS-gated). Filters by the approval audit
 * `job_name` so the manual preview ledger and real cron streams are not
 * mixed in. Drops any unknown summary keys and never exposes PII or raw
 * source rows.
 */
import { supabase } from '@/integrations/supabase/client';
import {
  OPERATIONS_APPROVAL_AUDIT_JOB_NAME,
  type OperationsApprovalAuditEvent,
  type OperationsApprovalAuditStatus,
} from './logOperationsApprovalAudit';

export const OPERATIONS_APPROVAL_AUDIT_CAP = 25;

export interface OperationsApprovalAuditEntry {
  id: string;
  jobName: string;
  startedAt: string;
  finishedAt: string | null;
  ok: boolean | null;
  status: string | null;
  durationMs: number | null;
  errorCode: string | null;
  eventType: OperationsApprovalAuditEvent | null;
  scope: 'manual_sla_real_run';
  auditStatus: OperationsApprovalAuditStatus | null;
  reasonCode: string | null;
  requestedBy: string | null;
  requestedAt: string | null;
  approvalTicket: string | null;
  expiresAt: string | null;
  dryRun: boolean;
  enableWrites: boolean;
  enableNotificationWrites: boolean;
  guardReason: string | null;
  context: 'browser' | 'server' | 'unknown';
}

export interface ListOperationsApprovalAuditResult {
  ok: boolean;
  entries: OperationsApprovalAuditEntry[];
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

export interface ListOperationsApprovalAuditDeps {
  read?: (
    limit: number,
  ) => Promise<{ data: CronRunLogRow[] | null; error: { message: string } | null }>;
}

const KNOWN_EVENTS: ReadonlyArray<OperationsApprovalAuditEvent> = [
  'production_approval_checked',
  'production_approval_rejected',
  'manual_real_run_requested',
  'manual_real_run_rejected',
  'guard_denied',
];

const KNOWN_STATUSES: ReadonlyArray<OperationsApprovalAuditStatus> = [
  'accepted',
  'rejected',
  'denied',
  'checked',
];

function asEvent(v: unknown): OperationsApprovalAuditEvent | null {
  return typeof v === 'string' && (KNOWN_EVENTS as readonly string[]).includes(v)
    ? (v as OperationsApprovalAuditEvent)
    : null;
}

function asStatus(v: unknown): OperationsApprovalAuditStatus | null {
  return typeof v === 'string' && (KNOWN_STATUSES as readonly string[]).includes(v)
    ? (v as OperationsApprovalAuditStatus)
    : null;
}

function asContext(v: unknown): 'browser' | 'server' | 'unknown' {
  return v === 'browser' || v === 'server' ? v : 'unknown';
}

function asStr(v: unknown, max = 200): string | null {
  return typeof v === 'string' ? v.slice(0, max) : null;
}

function sanitizeRow(row: CronRunLogRow): OperationsApprovalAuditEntry {
  const s =
    row.summary && typeof row.summary === 'object'
      ? (row.summary as Record<string, unknown>)
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
    eventType: asEvent(s.eventType),
    scope: 'manual_sla_real_run',
    auditStatus: asStatus(s.status),
    reasonCode: asStr(s.reasonCode, 120),
    requestedBy: asStr(s.requestedBy, 128),
    requestedAt: asStr(s.requestedAt, 64),
    approvalTicket: asStr(s.approvalTicket, 64),
    expiresAt: asStr(s.expiresAt, 64),
    dryRun: s.dryRun === true,
    enableWrites: s.enableWrites === true,
    enableNotificationWrites: s.enableNotificationWrites === true,
    guardReason: asStr(s.guardReason, 200),
    context: asContext(s.context),
  };
}

export async function listOperationsApprovalAudit(
  limit = OPERATIONS_APPROVAL_AUDIT_CAP,
  deps: ListOperationsApprovalAuditDeps = {},
): Promise<ListOperationsApprovalAuditResult> {
  const capped = Math.min(Math.max(limit | 0, 1), OPERATIONS_APPROVAL_AUDIT_CAP);
  const read =
    deps.read ??
    (async (l: number) => {
      const { data, error } = await supabase
        .from('cron_run_log')
        .select(
          'id, job_name, started_at, finished_at, ok, status, duration_ms, error_code, summary',
        )
        .eq('job_name', OPERATIONS_APPROVAL_AUDIT_JOB_NAME)
        .order('started_at', { ascending: false })
        .limit(l);
      return {
        data: (data as CronRunLogRow[] | null) ?? null,
        error: error ? { message: error.message } : null,
      };
    });
  try {
    const { data, error } = await read(capped);
    if (error) return { ok: false, entries: [], error: error.message };
    const rows = (data ?? []).slice(0, capped).map(sanitizeRow);
    return { ok: true, entries: rows };
  } catch (err) {
    return {
      ok: false,
      entries: [],
      error:
        err instanceof Error ? err.message : 'unknown approval audit read error',
    };
  }
}