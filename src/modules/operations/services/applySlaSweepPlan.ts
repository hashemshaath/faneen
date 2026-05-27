/**
 * BUSINESS-OPERATIONS-2G — Gated SLA sweep plan applier.
 *
 * Walks a `SweepPlan`'s actions and forwards each actionable kind
 * (`create` / `escalate` / `resolve`) to the injected `AlertWriter`.
 * `skip-*` actions are never forwarded.
 *
 * Safety gate (fails closed):
 *   - Requires `dryRun: false` AND `enableWrites: true`.
 *   - Either flag missing → returns `applied: false` with the gate reason;
 *     the writer is never called.
 *
 * Side-effect boundaries:
 *   - Never sends notifications.
 *   - Never mutates source-domain records.
 *   - Never bypasses idempotency (delegated to the writer).
 */
import { SLA_CONDITIONS, type SweepAction, type SweepPlan } from './slaSweep';
import type {
  AlertWriter,
  AlertWriteResult,
  CreateOperationalAlertInput,
} from './alertWriters';

export const APPLY_GATE_REQUIRES_NON_DRY_RUN =
  'applySlaSweepPlan requires dryRun:false';
export const APPLY_GATE_REQUIRES_ENABLE_WRITES =
  'applySlaSweepPlan requires enableWrites:true';

export type SweepActionContent = Pick<
  CreateOperationalAlertInput,
  'titleAr' | 'titleEn' | 'messageAr' | 'messageEn'
>;

export type SweepActionContentBuilder = (
  action: SweepAction,
) => SweepActionContent;

function defaultContent(action: SweepAction): SweepActionContent {
  // Safe placeholder: condition code only. Real localization is the caller's
  // responsibility via `contentBuilder` injection — never include PII here.
  return {
    titleAr: action.conditionCode,
    titleEn: action.conditionCode,
    messageAr: action.conditionCode,
    messageEn: action.conditionCode,
  };
}

export interface ApplySlaSweepPlanInput {
  plan: SweepPlan;
  writer: AlertWriter;
  dryRun: boolean;
  enableWrites: boolean;
  contentBuilder?: SweepActionContentBuilder;
}

export interface ApplySlaSweepPlanTotals {
  created: number;
  escalated: number;
  resolved: number;
  skipped: number;
  failed: number;
}

export interface ApplySlaSweepPlanResult {
  applied: boolean;
  reason?: string;
  totals: ApplySlaSweepPlanTotals;
  results: AlertWriteResult[];
}

function emptyTotals(): ApplySlaSweepPlanTotals {
  return { created: 0, escalated: 0, resolved: 0, skipped: 0, failed: 0 };
}

function bump(totals: ApplySlaSweepPlanTotals, r: AlertWriteResult): void {
  if (r.outcome === 'created') totals.created++;
  else if (r.outcome === 'escalated') totals.escalated++;
  else if (r.outcome === 'resolved') totals.resolved++;
  else if (r.outcome === 'skipped') totals.skipped++;
  else totals.failed++;
}

export async function applySlaSweepPlan(
  input: ApplySlaSweepPlanInput,
): Promise<ApplySlaSweepPlanResult> {
  // Fail-closed gate — never call the writer unless both flags are set.
  if (input.dryRun !== false) {
    return {
      applied: false,
      reason: APPLY_GATE_REQUIRES_NON_DRY_RUN,
      totals: emptyTotals(),
      results: [],
    };
  }
  if (input.enableWrites !== true) {
    return {
      applied: false,
      reason: APPLY_GATE_REQUIRES_ENABLE_WRITES,
      totals: emptyTotals(),
      results: [],
    };
  }

  const build = input.contentBuilder ?? defaultContent;
  const totals = emptyTotals();
  const results: AlertWriteResult[] = [];

  for (const action of input.plan.actions) {
    if (action.kind === 'create') {
      const cond = SLA_CONDITIONS[action.conditionCode];
      if (!cond || !action.idempotencyKey || !action.severity) {
        const r: AlertWriteResult = {
          outcome: 'skipped',
          reason: 'create action missing required fields',
        };
        results.push(r);
        bump(totals, r);
        continue;
      }
      const content = build(action);
      const r = await input.writer.create({
        domain: cond.domain,
        entityType: cond.entityType,
        entityId: action.entityId,
        conditionCode: action.conditionCode,
        severity: action.severity,
        idempotencyKey: action.idempotencyKey,
        ...content,
      });
      results.push(r);
      bump(totals, r);
    } else if (action.kind === 'escalate') {
      if (!action.alertId || !action.fromSeverity || !action.severity) {
        const r: AlertWriteResult = {
          outcome: 'skipped',
          reason: 'escalate action missing required fields',
        };
        results.push(r);
        bump(totals, r);
        continue;
      }
      const r = await input.writer.escalate({
        alertId: action.alertId,
        currentSeverity: action.fromSeverity,
        targetSeverity: action.severity,
      });
      results.push(r);
      bump(totals, r);
    } else if (action.kind === 'resolve') {
      if (!action.alertId) {
        const r: AlertWriteResult = {
          outcome: 'skipped',
          reason: 'resolve action missing alertId',
        };
        results.push(r);
        bump(totals, r);
        continue;
      }
      const r = await input.writer.resolve({ alertId: action.alertId });
      results.push(r);
      bump(totals, r);
    }
    // All skip-* kinds are intentionally ignored — never forwarded.
  }

  return { applied: true, totals, results };
}