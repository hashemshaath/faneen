/**
 * BUSINESS-OPERATIONS-2T — Server-only manual real-run dependency
 * factories.
 *
 * SERVER-ONLY MODULE. Do NOT import from any browser/UI page. These
 * factories construct the three side-effecting dependencies that the
 * manual SLA real-run executor + harness require:
 *
 *   - audit writer       (createManualRunAuditWriter)
 *   - pre/post run logger (createManualRunLogger)
 *   - alert writer        (createManualRunAlertWriter)
 *
 * SAFETY CONTRACT (do not weaken):
 *   - Every factory REQUIRES an injected admin/service-role Supabase
 *     client. Missing client → factory throws synchronously so misuse
 *     fails loudly at boot, never silently at runtime.
 *   - No factory creates its own Supabase client. The browser
 *     publishable client (`@/integrations/supabase/client`) is NEVER
 *     imported here.
 *   - No notification dispatcher, no recipient resolver, no SMS/email/
 *     push/WhatsApp imports. No cron scheduler. No UI imports.
 *   - Alert writer only forwards `create` / `escalate` / `resolve`.
 *     `skip-*` actions are filtered upstream by `applySlaSweepPlan` and
 *     never reach the writer; the writer additionally refuses
 *     non-promoting severity changes and refuses to reopen
 *     resolved/dismissed alerts.
 *   - Returned envelopes contain NO PII, no recipient IDs, no raw
 *     source rows, no notification bodies.
 *   - All writers NEVER throw — failures surface in the structured
 *     result object.
 *
 * The 2T phase wires factories ONLY. The harness composing them into a
 * live execution path remains gated behind:
 *   - OPERATIONS_REAL_RUN_ENABLED='true'
 *   - server execution context
 *   - admin/service_role
 *   - valid production approval + confirmation token
 * (enforced by `executeManualSlaRealRun` / `invokeManualSlaRealRunHarness`).
 */
import {
  isStrictPromotion,
  type AlertWriter,
  type AlertWriteResult,
  type CreateOperationalAlertInput,
  type EscalateOperationalAlertInput,
  type ResolveOperationalAlertInput,
} from './alertWriters';
import {
  buildSafeRunLogSummary,
  SLA_RUN_LOG_JOB_NAME,
  SLA_RUN_LOG_FUNCTION_NAME,
} from './persistSlaRunLog';
import type { SlaRunLogger, SlaRunLogRecord } from './dispatchSlaSweep';
import {
  buildApprovalAuditSummary,
  OPERATIONS_APPROVAL_AUDIT_JOB_NAME,
  OPERATIONS_APPROVAL_AUDIT_FUNCTION_NAME,
  type LogOperationsApprovalAuditInput,
  type LogOperationsApprovalAuditResult,
} from './logOperationsApprovalAudit';
import type { OperationsApprovalAuditWriter } from './manualRealRunRequest';

// ── Minimal admin client shape ────────────────────────────────────────────
//
// We deliberately type the injected client with the smallest surface we
// need (`rpc` + `from(...).insert/update/select/eq/in/maybeSingle`) so
// the factory module stays Supabase-free at the import level and tests
// can inject pure fakes without pulling in `@supabase/supabase-js`.

export interface AdminRpcResult<T = unknown> {
  data: T | null;
  error: { message: string } | null;
}

export interface AdminQueryBuilder {
  select(columns?: string): AdminQueryBuilder;
  insert(values: unknown): AdminQueryBuilder;
  update(values: unknown): AdminQueryBuilder;
  eq(column: string, value: unknown): AdminQueryBuilder;
  in(column: string, values: readonly unknown[]): AdminQueryBuilder;
  maybeSingle(): Promise<AdminRpcResult<Record<string, unknown>>>;
}

export interface ServerOnlyAdminClient {
  rpc(fn: string, args: Record<string, unknown>): Promise<AdminRpcResult>;
  from(table: string): AdminQueryBuilder;
}

export interface ManualRunFactoryInput {
  supabaseAdmin: ServerOnlyAdminClient;
}

function requireAdmin(input: ManualRunFactoryInput | undefined, fn: string): ServerOnlyAdminClient {
  if (
    !input ||
    typeof input !== 'object' ||
    !input.supabaseAdmin ||
    typeof input.supabaseAdmin.from !== 'function' ||
    typeof input.supabaseAdmin.rpc !== 'function'
  ) {
    throw new Error(
      `[operations:2T] ${fn} requires an injected server-only admin Supabase client`,
    );
  }
  return input.supabaseAdmin;
}

function nowIso(): string {
  return new Date().toISOString();
}

// ── 1) Approval audit writer ─────────────────────────────────────────────

/**
 * Build a server-only `OperationsApprovalAuditWriter` backed by the
 * injected admin client's `log_cron_run` RPC. Persists ONLY whitelisted
 * summary fields (no PII, no tokens, no raw rows). Never throws.
 */
export function createManualRunAuditWriter(
  input: ManualRunFactoryInput,
): OperationsApprovalAuditWriter {
  const admin = requireAdmin(input, 'createManualRunAuditWriter');
  return async (
    auditInput: LogOperationsApprovalAuditInput,
  ): Promise<LogOperationsApprovalAuditResult> => {
    try {
      const summary = buildApprovalAuditSummary(auditInput);
      const ok = summary.status === 'accepted' || summary.status === 'checked';
      const startedAt = summary.requestedAt;
      const finishedAt = nowIso();
      const { data, error } = await admin.rpc('log_cron_run', {
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
  };
}

// ── 2) Pre/post run logger ───────────────────────────────────────────────

/**
 * Build a server-only `SlaRunLogger` backed by the injected admin
 * client. Used as BOTH the pre-run and post-run logger.
 *
 * Pre-run semantics: caller (executor) awaits this logger before any
 * writes. If it throws, the executor aborts BEFORE writing — pre-run
 * log failure must be loud, so this logger throws on RPC failure.
 *
 * Post-run semantics: the executor catches and surfaces logger
 * failures as `postRunLogError` WITHOUT rolling back alert writes.
 */
export function createManualRunLogger(input: ManualRunFactoryInput): SlaRunLogger {
  const admin = requireAdmin(input, 'createManualRunLogger');
  return async (record: SlaRunLogRecord) => {
    const summary = buildSafeRunLogSummary(record);
    const errorCode =
      record.status === 'failed'
        ? record.error
          ? 'sla_sweep_failed'
          : 'sla_sweep_failed_unknown'
        : null;
    const errorMessage =
      record.status === 'failed' ? (record.error ?? null) : null;
    const { error } = await admin.rpc('log_cron_run', {
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
    if (error) {
      // Throwing here is INTENTIONAL: executor pre-run logger contract
      // demands a loud failure so writes are skipped. Post-run usage
      // is caught by the executor and surfaced as postRunLogError.
      throw new Error(error.message);
    }
  };
}

// ── 3) Alert writer ──────────────────────────────────────────────────────

/**
 * Build a server-only `AlertWriter` backed by the injected admin
 * client. Mirrors the safety contract of `createSupabaseAlertWriter`
 * but accepts an injected client (no global Supabase imports).
 *
 * Guarantees:
 *   - Forwards only `create` / `escalate` / `resolve`.
 *   - Preserves caller-supplied `idempotencyKey` verbatim.
 *   - Returns `skipped` (never `created`) when the idempotency key is
 *     already taken.
 *   - Refuses non-promoting severity changes (`isStrictPromotion`).
 *   - Refuses to reopen resolved/dismissed alerts.
 *   - Never throws — all outcomes returned in the envelope.
 *   - Never sends notifications. Never imports recipient resolvers or
 *     notification dispatchers. Never mutates source-domain records.
 */
export function createManualRunAlertWriter(
  input: ManualRunFactoryInput,
): AlertWriter {
  const admin = requireAdmin(input, 'createManualRunAlertWriter');

  return {
    async create(
      payload: CreateOperationalAlertInput,
    ): Promise<AlertWriteResult> {
      try {
        if (!payload?.idempotencyKey || typeof payload.idempotencyKey !== 'string') {
          return { outcome: 'skipped', reason: 'idempotencyKey missing' };
        }
        const existing = await admin
          .from('operational_alerts')
          .select('id, status')
          .eq('idempotency_key', payload.idempotencyKey)
          .maybeSingle();
        if (existing.error) {
          return { outcome: 'failed', error: existing.error.message };
        }
        if (existing.data) {
          const status = (existing.data as { status?: string }).status;
          const id = (existing.data as { id?: string }).id;
          if (status === 'open' || status === 'acknowledged') {
            return {
              outcome: 'skipped',
              alertId: id,
              reason: 'idempotency_key already has an active alert',
            };
          }
          return {
            outcome: 'skipped',
            alertId: id,
            reason: `idempotency_key already used (status=${String(status)})`,
          };
        }
        const triggeredAt = payload.triggeredAt ?? nowIso();
        const insert = await admin
          .from('operational_alerts')
          .insert([{
            domain: payload.domain,
            entity_type: payload.entityType,
            entity_id: payload.entityId,
            condition_code: payload.conditionCode,
            severity: payload.severity,
            status: 'open',
            title_ar: payload.titleAr,
            title_en: payload.titleEn,
            message_ar: payload.messageAr,
            message_en: payload.messageEn,
            owner_user_id: payload.ownerUserId ?? null,
            owner_business_id: payload.ownerBusinessId ?? null,
            due_at: payload.dueAt ?? null,
            triggered_at: triggeredAt,
            idempotency_key: payload.idempotencyKey,
            metadata: payload.metadata ?? {},
          }])
          .select('id')
          .maybeSingle();
        if (insert.error) {
          return { outcome: 'failed', error: insert.error.message };
        }
        return {
          outcome: 'created',
          alertId: (insert.data as { id?: string } | null)?.id,
        };
      } catch (err) {
        return {
          outcome: 'failed',
          error: err instanceof Error ? err.message : 'unknown create error',
        };
      }
    },

    async escalate(
      payload: EscalateOperationalAlertInput,
    ): Promise<AlertWriteResult> {
      try {
        if (!isStrictPromotion(payload.currentSeverity, payload.targetSeverity)) {
          return {
            outcome: 'skipped',
            alertId: payload.alertId,
            reason: 'refused non-promoting severity change',
          };
        }
        const update = await admin
          .from('operational_alerts')
          .update({ severity: payload.targetSeverity })
          .eq('id', payload.alertId)
          .in('status', ['open', 'acknowledged'])
          .eq('severity', payload.currentSeverity)
          .select('id, severity')
          .maybeSingle();
        if (update.error) {
          return {
            outcome: 'failed',
            alertId: payload.alertId,
            error: update.error.message,
          };
        }
        if (!update.data) {
          return {
            outcome: 'skipped',
            alertId: payload.alertId,
            reason: 'no matching active alert at expected severity',
          };
        }
        return { outcome: 'escalated', alertId: payload.alertId };
      } catch (err) {
        return {
          outcome: 'failed',
          alertId: payload.alertId,
          error: err instanceof Error ? err.message : 'unknown escalate error',
        };
      }
    },

    async resolve(
      payload: ResolveOperationalAlertInput,
    ): Promise<AlertWriteResult> {
      try {
        const update = await admin
          .from('operational_alerts')
          .update({
            status: 'resolved',
            resolved_at: nowIso(),
            resolved_by: payload.resolvedBy ?? null,
          })
          .eq('id', payload.alertId)
          .in('status', ['open', 'acknowledged'])
          .select('id')
          .maybeSingle();
        if (update.error) {
          return {
            outcome: 'failed',
            alertId: payload.alertId,
            error: update.error.message,
          };
        }
        if (!update.data) {
          return {
            outcome: 'skipped',
            alertId: payload.alertId,
            reason: 'no active alert to resolve',
          };
        }
        return { outcome: 'resolved', alertId: payload.alertId };
      } catch (err) {
        return {
          outcome: 'failed',
          alertId: payload.alertId,
          error: err instanceof Error ? err.message : 'unknown resolve error',
        };
      }
    },
  };
}

/**
 * Convenience composer for the three factories. Returns a bundle that
 * the harness/CLI can plug directly into `invokeManualSlaRealRunHarness`.
 * Composition only — never executes anything.
 */
export interface ManualRunDependencyBundle {
  alertWriter: AlertWriter;
  preRunLogger: SlaRunLogger;
  postRunLogger: SlaRunLogger;
  auditWriter: OperationsApprovalAuditWriter;
}

export function createManualRunDependencyBundle(
  input: ManualRunFactoryInput,
): ManualRunDependencyBundle {
  const admin = requireAdmin(input, 'createManualRunDependencyBundle');
  const composed = { supabaseAdmin: admin };
  return {
    alertWriter: createManualRunAlertWriter(composed),
    preRunLogger: createManualRunLogger(composed),
    postRunLogger: createManualRunLogger(composed),
    auditWriter: createManualRunAuditWriter(composed),
  };
}
