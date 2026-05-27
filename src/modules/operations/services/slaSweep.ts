/**
 * BUSINESS-OPERATIONS-2C — Dry-run SLA sweep evaluator.
 *
 * Pure, side-effect-free planner. Given a snapshot of candidate entities
 * plus the alerts that already exist in `operational_alerts`, it returns
 * the set of actions a future (post-2C) writer would perform:
 *
 *   - create   → no matching open/ack alert for the idempotency key
 *   - escalate → existing alert exists but severity should promote
 *   - resolve  → existing open/ack alert whose condition no longer holds
 *   - skip     → already covered / not eligible / unsupported condition
 *
 * Dry-run guarantee: this module performs **no** Supabase calls, no
 * notifications, no emails, and no writes of any kind. It returns a plan.
 * The orchestration layer (phase 2D+) will be responsible for applying it.
 */
import {
  OPERATIONAL_ALERT_SEVERITIES,
  type OperationalAlertDomain,
  type OperationalAlertSeverity,
  type OperationalAlertStatus,
} from '../constants/alerts';

// ── Condition catalog ──────────────────────────────────────────────────────
// Mirrors docs/business-operations-sla-escalation.md §1. Each condition is
// keyed by `condition_code` and carries the threshold + initial severity.
// Keep additive — new conditions must not silently widen behavior.

export interface SlaCondition {
  code: string;
  domain: OperationalAlertDomain;
  entityType: string;
  thresholdHours: number;
  initialSeverity: OperationalAlertSeverity;
  /** Promotion ladder, each tick = +thresholdHours after triggered_at. */
  promotion?: OperationalAlertSeverity[];
  /** Idempotency bucket: 'day' = per-UTC-day, 'hour' = per-UTC-hour. */
  bucket: 'day' | 'hour';
}

export const SLA_CONDITIONS: Readonly<Record<string, SlaCondition>> = {
  'lead.submitted_not_viewed_24h': {
    code: 'lead.submitted_not_viewed_24h',
    domain: 'leads',
    entityType: 'quote_requests',
    thresholdHours: 24,
    initialSeverity: 'warning',
    promotion: ['overdue'],
    bucket: 'day',
  },
  'lead.contacted_no_quote_72h': {
    code: 'lead.contacted_no_quote_72h',
    domain: 'leads',
    entityType: 'quote_requests',
    thresholdHours: 72,
    initialSeverity: 'overdue',
    bucket: 'day',
  },
  'invitation.pending_7d': {
    code: 'invitation.pending_7d',
    domain: 'invitations',
    entityType: 'business_staff_invitations',
    thresholdHours: 24 * 7,
    initialSeverity: 'warning',
    promotion: ['overdue'],
    bucket: 'day',
  },
  'contract.pending_signature_7d': {
    code: 'contract.pending_signature_7d',
    domain: 'contracts',
    entityType: 'contracts',
    thresholdHours: 24 * 7,
    initialSeverity: 'warning',
    promotion: ['overdue', 'critical'],
    bucket: 'day',
  },
  'payment.intent_pending_1h': {
    code: 'payment.intent_pending_1h',
    domain: 'payments',
    entityType: 'payment_intents',
    thresholdHours: 1,
    initialSeverity: 'warning',
    promotion: ['overdue', 'critical'],
    bucket: 'hour',
  },
} as const;

export function isKnownSlaCondition(code: string): boolean {
  return Object.prototype.hasOwnProperty.call(SLA_CONDITIONS, code);
}

// ── Input / output shapes ──────────────────────────────────────────────────

export interface SweepCandidate {
  conditionCode: string;
  entityId: string;
  /** When the condition first started being true for this entity. */
  conditionSince: string; // ISO timestamp
  /** Optional owner hints for the eventual write phase. */
  ownerUserId?: string | null;
  ownerBusinessId?: string | null;
  /** True if the underlying condition no longer holds (e.g. lead viewed). */
  resolved?: boolean;
}

export interface ExistingAlert {
  id: string;
  conditionCode: string;
  entityId: string;
  severity: OperationalAlertSeverity;
  status: OperationalAlertStatus;
  triggeredAt: string;
  idempotencyKey: string;
}

export interface SweepInput {
  now: Date;
  candidates: readonly SweepCandidate[];
  existingAlerts: readonly ExistingAlert[];
}

export type SweepActionKind =
  | 'create'
  | 'escalate'
  | 'resolve'
  | 'skip-not-yet-due'
  | 'skip-idempotent'
  | 'skip-unknown-condition'
  | 'skip-resolved-no-alert';

export interface SweepAction {
  kind: SweepActionKind;
  conditionCode: string;
  entityId: string;
  idempotencyKey?: string;
  severity?: OperationalAlertSeverity;
  fromSeverity?: OperationalAlertSeverity;
  alertId?: string;
  reason?: string;
}

export interface SweepPlan {
  dryRun: true;
  evaluatedAt: string;
  totals: {
    candidates: number;
    create: number;
    escalate: number;
    resolve: number;
    skipped: number;
  };
  actions: SweepAction[];
}

// ── Helpers ────────────────────────────────────────────────────────────────

function bucketSuffix(now: Date, bucket: 'day' | 'hour'): string {
  const iso = now.toISOString();
  return bucket === 'day' ? iso.slice(0, 10) : iso.slice(0, 13);
}

export function buildIdempotencyKey(
  cond: SlaCondition,
  entityId: string,
  now: Date,
): string {
  return `sla:${cond.domain}:${entityId}:${cond.code}:${bucketSuffix(now, cond.bucket)}`;
}

function nextSeverity(
  cond: SlaCondition,
  current: OperationalAlertSeverity,
  hoursSinceTriggered: number,
): OperationalAlertSeverity | null {
  const ladder: OperationalAlertSeverity[] = [
    cond.initialSeverity,
    ...(cond.promotion ?? []),
  ];
  const idx = ladder.indexOf(current);
  if (idx < 0 || idx >= ladder.length - 1) return null;
  // Each promotion step requires another full thresholdHours window.
  const stepsEarned = Math.floor(hoursSinceTriggered / cond.thresholdHours);
  const target = ladder[Math.min(stepsEarned, ladder.length - 1)];
  if (target === current) return null;
  // Only promote forward.
  const targetIdx = ladder.indexOf(target);
  return targetIdx > idx ? target : null;
}

function hoursBetween(a: Date, b: Date): number {
  return (a.getTime() - b.getTime()) / 36e5;
}

// ── Evaluator ──────────────────────────────────────────────────────────────

/**
 * Pure dry-run evaluator. Does NOT mutate inputs and performs no IO.
 */
export function evaluateSlaSweep(input: SweepInput): SweepPlan {
  const { now, candidates, existingAlerts } = input;

  const actions: SweepAction[] = [];
  let create = 0,
    escalate = 0,
    resolve = 0,
    skipped = 0;

  // Index existing alerts for O(1) lookup by (conditionCode, entityId)
  // and by idempotency key.
  const byEntity = new Map<string, ExistingAlert>();
  const byKey = new Map<string, ExistingAlert>();
  for (const a of existingAlerts) {
    byEntity.set(`${a.conditionCode}|${a.entityId}`, a);
    byKey.set(a.idempotencyKey, a);
  }

  const seenEntities = new Set<string>();

  for (const cand of candidates) {
    const entityKey = `${cand.conditionCode}|${cand.entityId}`;
    seenEntities.add(entityKey);

    const cond = SLA_CONDITIONS[cand.conditionCode];
    if (!cond) {
      actions.push({
        kind: 'skip-unknown-condition',
        conditionCode: cand.conditionCode,
        entityId: cand.entityId,
        reason: 'condition not in SLA_CONDITIONS catalog',
      });
      skipped++;
      continue;
    }

    const existing = byEntity.get(entityKey);

    // Resolution path: underlying condition no longer holds.
    if (cand.resolved) {
      if (existing && (existing.status === 'open' || existing.status === 'acknowledged')) {
        actions.push({
          kind: 'resolve',
          conditionCode: cond.code,
          entityId: cand.entityId,
          alertId: existing.id,
          fromSeverity: existing.severity,
        });
        resolve++;
      } else {
        actions.push({
          kind: 'skip-resolved-no-alert',
          conditionCode: cond.code,
          entityId: cand.entityId,
          reason: 'no open/acknowledged alert to resolve',
        });
        skipped++;
      }
      continue;
    }

    const since = new Date(cand.conditionSince);
    const ageHours = hoursBetween(now, since);

    if (ageHours < cond.thresholdHours) {
      actions.push({
        kind: 'skip-not-yet-due',
        conditionCode: cond.code,
        entityId: cand.entityId,
        reason: `age ${ageHours.toFixed(2)}h < threshold ${cond.thresholdHours}h`,
      });
      skipped++;
      continue;
    }

    if (!existing) {
      const key = buildIdempotencyKey(cond, cand.entityId, now);
      if (byKey.has(key)) {
        actions.push({
          kind: 'skip-idempotent',
          conditionCode: cond.code,
          entityId: cand.entityId,
          idempotencyKey: key,
          reason: 'alert already exists for this idempotency bucket',
        });
        skipped++;
        continue;
      }
      actions.push({
        kind: 'create',
        conditionCode: cond.code,
        entityId: cand.entityId,
        idempotencyKey: key,
        severity: cond.initialSeverity,
      });
      create++;
      continue;
    }

    // Existing alert: consider escalation only if still actionable.
    if (existing.status === 'open' || existing.status === 'acknowledged') {
      const hoursSinceTriggered = hoursBetween(now, new Date(existing.triggeredAt));
      const target = nextSeverity(cond, existing.severity, hoursSinceTriggered);
      if (target) {
        actions.push({
          kind: 'escalate',
          conditionCode: cond.code,
          entityId: cand.entityId,
          alertId: existing.id,
          fromSeverity: existing.severity,
          severity: target,
        });
        escalate++;
        continue;
      }
    }

    actions.push({
      kind: 'skip-idempotent',
      conditionCode: cond.code,
      entityId: cand.entityId,
      idempotencyKey: existing.idempotencyKey,
      alertId: existing.id,
      reason: 'existing alert covers this condition',
    });
    skipped++;
  }

  return {
    dryRun: true,
    evaluatedAt: now.toISOString(),
    totals: {
      candidates: candidates.length,
      create,
      escalate,
      resolve,
      skipped,
    },
    actions,
  };
}

// Re-export severity list for downstream consumers that build UI from a plan.
export { OPERATIONAL_ALERT_SEVERITIES };