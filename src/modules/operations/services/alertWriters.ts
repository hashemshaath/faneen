/**
 * BUSINESS-OPERATIONS-2G — Approved, idempotent write wrappers for
 * `operational_alerts`.
 *
 * This file is the ONLY app-side write path to `operational_alerts`. It
 * provides three operations:
 *
 *   - create   → insert a new alert, idempotent on `idempotency_key`
 *   - escalate → promote severity of an existing alert (forward-only)
 *   - resolve  → close an active alert
 *
 * Safety guarantees:
 *   - Never mutates source-domain records.
 *   - Never sends notifications.
 *   - Never downgrades severity.
 *   - Never reopens resolved/dismissed alerts.
 *   - Never throws — all outcomes are returned in a structured envelope.
 *
 * Tests inject the `AlertWriter` interface directly. The Supabase-backed
 * implementation is exposed as `createSupabaseAlertWriter()`.
 */
import { supabase } from '@/integrations/supabase/client';
import {
  OPERATIONAL_ALERT_SEVERITIES,
  type OperationalAlertDomain,
  type OperationalAlertSeverity,
} from '../constants/alerts';

export type AlertWriteOutcome =
  | 'created'
  | 'escalated'
  | 'resolved'
  | 'skipped'
  | 'failed';

export interface AlertWriteResult {
  outcome: AlertWriteOutcome;
  alertId?: string;
  reason?: string;
  error?: string;
}

export interface CreateOperationalAlertInput {
  domain: OperationalAlertDomain;
  entityType: string;
  entityId: string;
  conditionCode: string;
  severity: OperationalAlertSeverity;
  idempotencyKey: string;
  titleAr: string;
  titleEn: string;
  messageAr: string;
  messageEn: string;
  ownerUserId?: string | null;
  ownerBusinessId?: string | null;
  dueAt?: string | null;
  triggeredAt?: string | null;
  metadata?: Record<string, unknown> | null;
}

export interface EscalateOperationalAlertInput {
  alertId: string;
  currentSeverity: OperationalAlertSeverity;
  targetSeverity: OperationalAlertSeverity;
}

export interface ResolveOperationalAlertInput {
  alertId: string;
  resolvedBy?: string | null;
}

export interface AlertWriter {
  create(input: CreateOperationalAlertInput): Promise<AlertWriteResult>;
  escalate(input: EscalateOperationalAlertInput): Promise<AlertWriteResult>;
  resolve(input: ResolveOperationalAlertInput): Promise<AlertWriteResult>;
}

/** Forward-only severity ladder index (mirrors constants). */
function severityRank(s: OperationalAlertSeverity): number {
  return (OPERATIONAL_ALERT_SEVERITIES as readonly string[]).indexOf(s);
}

/** Returns true iff `target` is strictly higher on the ladder than `current`. */
export function isStrictPromotion(
  current: OperationalAlertSeverity,
  target: OperationalAlertSeverity,
): boolean {
  const a = severityRank(current);
  const b = severityRank(target);
  return a >= 0 && b >= 0 && b > a;
}

// ── Supabase-backed implementation ────────────────────────────────────────

function nowIso(): string {
  return new Date().toISOString();
}

/**
 * Build the default Supabase-backed writer. Tests should inject a fake
 * implementation instead of stubbing the global client.
 */
export function createSupabaseAlertWriter(): AlertWriter {
  return {
    async create(input) {
      try {
        // Idempotency: skip if an alert with the same key is still active.
        const existing = await supabase
          .from('operational_alerts')
          .select('id, status')
          .eq('idempotency_key', input.idempotencyKey)
          .maybeSingle();
        if (existing.error) {
          return { outcome: 'failed', error: existing.error.message };
        }
        if (existing.data) {
          const status = (existing.data as { status?: string }).status;
          if (status === 'open' || status === 'acknowledged') {
            return {
              outcome: 'skipped',
              alertId: (existing.data as { id?: string }).id,
              reason: 'idempotency_key already has an active alert',
            };
          }
          // Resolved/dismissed → also skip; never reopen.
          return {
            outcome: 'skipped',
            alertId: (existing.data as { id?: string }).id,
            reason: `idempotency_key already used (status=${String(status)})`,
          };
        }
        const triggeredAt = input.triggeredAt ?? nowIso();
        const insert = await supabase
          .from('operational_alerts')
          .insert({
            domain: input.domain,
            entity_type: input.entityType,
            entity_id: input.entityId,
            condition_code: input.conditionCode,
            severity: input.severity,
            status: 'open',
            title_ar: input.titleAr,
            title_en: input.titleEn,
            message_ar: input.messageAr,
            message_en: input.messageEn,
            owner_user_id: input.ownerUserId ?? null,
            owner_business_id: input.ownerBusinessId ?? null,
            due_at: input.dueAt ?? null,
            triggered_at: triggeredAt,
            idempotency_key: input.idempotencyKey,
            metadata: input.metadata ?? {},
          })
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

    async escalate(input) {
      try {
        if (!isStrictPromotion(input.currentSeverity, input.targetSeverity)) {
          return {
            outcome: 'skipped',
            alertId: input.alertId,
            reason: 'refused non-promoting severity change',
          };
        }
        const update = await supabase
          .from('operational_alerts')
          .update({ severity: input.targetSeverity })
          .eq('id', input.alertId)
          .in('status', ['open', 'acknowledged'])
          .eq('severity', input.currentSeverity)
          .select('id, severity')
          .maybeSingle();
        if (update.error) {
          return { outcome: 'failed', alertId: input.alertId, error: update.error.message };
        }
        if (!update.data) {
          return {
            outcome: 'skipped',
            alertId: input.alertId,
            reason: 'no matching active alert at expected severity',
          };
        }
        return { outcome: 'escalated', alertId: input.alertId };
      } catch (err) {
        return {
          outcome: 'failed',
          alertId: input.alertId,
          error: err instanceof Error ? err.message : 'unknown escalate error',
        };
      }
    },

    async resolve(input) {
      try {
        const update = await supabase
          .from('operational_alerts')
          .update({
            status: 'resolved',
            resolved_at: nowIso(),
            resolved_by: input.resolvedBy ?? null,
          })
          .eq('id', input.alertId)
          .in('status', ['open', 'acknowledged'])
          .select('id')
          .maybeSingle();
        if (update.error) {
          return { outcome: 'failed', alertId: input.alertId, error: update.error.message };
        }
        if (!update.data) {
          return {
            outcome: 'skipped',
            alertId: input.alertId,
            reason: 'no active alert to resolve',
          };
        }
        return { outcome: 'resolved', alertId: input.alertId };
      } catch (err) {
        return {
          outcome: 'failed',
          alertId: input.alertId,
          error: err instanceof Error ? err.message : 'unknown resolve error',
        };
      }
    },
  };
}