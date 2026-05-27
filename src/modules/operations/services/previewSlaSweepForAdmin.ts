/**
 * BUSINESS-OPERATIONS-2F — Admin-facing dry-run SLA sweep preview.
 *
 * Orchestrates production candidate loaders + existing alert snapshots
 * through `dispatchSlaSweep` in DRY-RUN mode and returns a compact,
 * PII-safe summary suitable for an admin operations dashboard.
 *
 * Guarantees
 * ──────────
 *   - Calls `dispatchSlaSweep` with `dryRun: true` (default).
 *   - Never mutates alerts, never sends notifications.
 *   - Returns only operational metadata (ids, codes, severities, counts).
 *   - No customer names, phones, emails, message bodies, or raw rows.
 *   - Logger failures surface as `logError`; loader failures surface as
 *     `loaderErrors`; neither blocks the preview.
 */
import {
  dispatchSlaSweep,
  type SlaRunLogRecord,
} from './dispatchSlaSweep';
import {
  loadSlaSweepCandidates,
  type LoaderError,
  type RowFetchers,
  type SlaConditionCode,
} from './candidateLoaders';
import {
  PRODUCTION_ROW_FETCHERS,
  loadExistingAlertSnapshots,
} from './productionFetchers';
import type { ExistingAlert, SweepAction, SweepActionKind } from './slaSweep';
import { createSupabaseSlaRunLogger } from './persistSlaRunLog';

export const DEFAULT_PREVIEW_SAMPLE_LIMIT = 25;
const HARD_SAMPLE_LIMIT = 100;

export interface PreviewSlaSweepInput {
  now?: Date;
  enabled?: readonly SlaConditionCode[];
  /** Default 25, capped at 100. */
  sampleLimit?: number;
  /** Persist the run log via the supabase logger. Defaults to true. */
  persistLog?: boolean;
  // ── Injection points for tests ──
  fetchers?: RowFetchers;
  loadExistingAlerts?: () => Promise<ExistingAlert[]>;
  logger?: import('./dispatchSlaSweep').SlaRunLogger;
}

/** A PII-safe projection of a SweepAction for admin display. */
export interface SafeActionSample {
  kind: SweepActionKind;
  conditionCode: string;
  entityId: string;
  severity?: string;
  fromSeverity?: string;
  alertId?: string;
  idempotencyKey?: string;
}

export interface PreviewSlaSweepResult {
  /** Always true in this phase. */
  dryRun: true;
  evaluatedAt: string;
  totals: {
    candidates: number;
    create: number;
    escalate: number;
    resolve: number;
    skipped: number;
    plannedNotifications: number;
    existingAlerts: number;
  };
  actionCountsByKind: Record<SweepActionKind, number>;
  loaderErrors: LoaderError[];
  existingAlertsError?: string;
  log: SlaRunLogRecord;
  logError?: string;
  /** Capped sample of actions, no PII. */
  sampleActions: SafeActionSample[];
  sampleLimit: number;
  partial: boolean;
}

function toSafeSample(a: SweepAction): SafeActionSample {
  return {
    kind: a.kind,
    conditionCode: a.conditionCode,
    entityId: a.entityId,
    severity: a.severity,
    fromSeverity: a.fromSeverity,
    alertId: a.alertId,
    idempotencyKey: a.idempotencyKey,
  };
}

function countActionsByKind(actions: readonly SweepAction[]): Record<SweepActionKind, number> {
  const out = {
    create: 0,
    escalate: 0,
    resolve: 0,
    'skip-not-yet-due': 0,
    'skip-idempotent': 0,
    'skip-unknown-condition': 0,
    'skip-resolved-no-alert': 0,
  } as Record<SweepActionKind, number>;
  for (const a of actions) out[a.kind]++;
  return out;
}

/**
 * Admin preview of the SLA sweep. Dry-run by construction.
 */
export async function previewSlaSweepForAdmin(
  input: PreviewSlaSweepInput = {},
): Promise<PreviewSlaSweepResult> {
  const now = input.now ?? new Date();
  const sampleLimit = Math.min(
    Math.max(input.sampleLimit ?? DEFAULT_PREVIEW_SAMPLE_LIMIT, 1),
    HARD_SAMPLE_LIMIT,
  );
  const fetchers = input.fetchers ?? PRODUCTION_ROW_FETCHERS;
  const loadAlerts = input.loadExistingAlerts ?? loadExistingAlertSnapshots;
  const persistLog = input.persistLog ?? true;
  const logger =
    input.logger ?? (persistLog ? createSupabaseSlaRunLogger() : undefined);

  const [candidateRes, alertsRes] = await Promise.all([
    loadSlaSweepCandidates({ now, enabled: input.enabled, fetchers }),
    loadAlerts().then(
      (alerts) => ({ alerts, error: undefined as string | undefined }),
      (err: unknown) => ({
        alerts: [] as ExistingAlert[],
        error: err instanceof Error ? err.message : 'unknown existing-alerts loader error',
      }),
    ),
  ]);

  const res = await dispatchSlaSweep({
    now,
    candidates: candidateRes.candidates,
    existingAlerts: alertsRes.alerts,
    dryRun: true,
    logger,
  });

  const actions = res.plan?.actions ?? [];
  const partial = candidateRes.partial || !!alertsRes.error;

  return {
    dryRun: true,
    evaluatedAt: res.plan?.evaluatedAt ?? now.toISOString(),
    totals: {
      candidates: res.plan?.totals.candidates ?? 0,
      create: res.plan?.totals.create ?? 0,
      escalate: res.plan?.totals.escalate ?? 0,
      resolve: res.plan?.totals.resolve ?? 0,
      skipped: res.plan?.totals.skipped ?? 0,
      plannedNotifications: res.notifications?.totals.planned ?? 0,
      existingAlerts: alertsRes.alerts.length,
    },
    actionCountsByKind: countActionsByKind(actions),
    loaderErrors: candidateRes.loaderErrors,
    existingAlertsError: alertsRes.error,
    log: res.log,
    logError: res.logError,
    sampleActions: actions.slice(0, sampleLimit).map(toSafeSample),
    sampleLimit,
    partial,
  };
}