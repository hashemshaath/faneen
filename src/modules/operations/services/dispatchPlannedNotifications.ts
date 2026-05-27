/**
 * BUSINESS-OPERATIONS-2H + 2K — Gated planned-notification dispatcher
 * with multi-recipient fan-out.
 *
 * Walks a `NotificationPlan` (produced by `planNotifications`) and
 * hands each (planned × recipient) pair to the injected
 * `NotificationDispatcher` exactly once per run.
 *
 * Safety gate (fails closed):
 *   - Requires `dryRun: false` AND `enableNotificationWrites: true`
 *     AND a non-null `dispatcher` AND a non-null `recipientResolver`.
 *     Any missing prerequisite → returns `dispatched: false` with the
 *     gate reason; the dispatcher is never invoked. This gate is
 *     INDEPENDENT of the alert-write gate (`enableWrites`).
 *
 * Fan-out (2K):
 *   - `recipientResolver` may return a single recipient, an array of
 *     recipients, or `null`. Recipients are deduped by `userId` per
 *     planned notification.
 *   - Each unique (planned × userId) pair gets its own deterministic
 *     `notificationKey` via `buildRecipientNotificationKey`, which
 *     guarantees per-recipient idempotency across runs.
 *   - Duplicate (planned × userId) pairs within the run are skipped.
 *
 * Per-run guarantees:
 *   - Resolver throws → one failed result, loop continues.
 *   - Dispatcher throws → one failed result for that recipient, loop
 *     continues for remaining recipients.
 *   - Missing/unresolved recipients are skipped (never failed).
 *   - Unsupported channels (anything other than `in_app`) are skipped
 *     and counted under `unsupportedChannelSkipped`. No SMS / email /
 *     push / external messaging delivery.
 *
 * Channel: in_app only. Other surfaces are out of scope here.
 */
import type { NotificationPlan, PlannedNotification } from './planNotifications';
import {
  buildNotificationKey,
  buildRecipientNotificationKey,
  defaultNotificationContent,
  type NotificationContentBuilder,
  type NotificationDispatcher,
  type NotificationDispatchResult,
  type NotificationRecipient,
} from './notificationDispatcher';

export const NOTIFICATION_GATE_REQUIRES_NON_DRY_RUN =
  'dispatchPlannedNotifications requires dryRun:false';
export const NOTIFICATION_GATE_REQUIRES_ENABLE_NOTIFICATION_WRITES =
  'dispatchPlannedNotifications requires enableNotificationWrites:true';
export const NOTIFICATION_GATE_REQUIRES_DISPATCHER =
  'dispatchPlannedNotifications requires a NotificationDispatcher';
export const NOTIFICATION_GATE_REQUIRES_RESOLVER =
  'dispatchPlannedNotifications requires a recipientResolver';

/**
 * Recipient resolver may return:
 *   - a single `NotificationRecipient` (back-compat with 2H/2I)
 *   - an array of recipients (2K multi-recipient fan-out)
 *   - `null` / `undefined` when no recipient is resolved
 */
export type NotificationRecipientResolver = (
  planned: PlannedNotification,
) =>
  | NotificationRecipient
  | readonly NotificationRecipient[]
  | null
  | undefined
  | Promise<
      | NotificationRecipient
      | readonly NotificationRecipient[]
      | null
      | undefined
    >;

export interface DispatchPlannedNotificationsInput {
  plan: NotificationPlan;
  dispatcher?: NotificationDispatcher;
  recipientResolver?: NotificationRecipientResolver;
  contentBuilder?: NotificationContentBuilder;
  dryRun: boolean;
  enableNotificationWrites: boolean;
}

export interface DispatchPlannedNotificationsTotals {
  /** Number of planned notifications in the input plan. */
  planned: number;
  /** Unique (planned × recipient) deliveries actually attempted. */
  deliveriesAttempted: number;
  sent: number;
  /** Aggregate of all skipped reasons. */
  skipped: number;
  failed: number;
  /** Subset of `skipped`: channel not supported (non-`in_app`). */
  unsupportedChannelSkipped: number;
  /** Subset of `skipped`: resolver returned no usable recipients. */
  missingRecipientSkipped: number;
  /** Subset of `skipped`: duplicate (planned × recipient) within run. */
  duplicateSkipped: number;
}

export interface DispatchPlannedNotificationsResult {
  dispatched: boolean;
  reason?: string;
  totals: DispatchPlannedNotificationsTotals;
  results: NotificationDispatchResult[];
}

function emptyTotals(planned: number): DispatchPlannedNotificationsTotals {
  return {
    planned,
    deliveriesAttempted: 0,
    sent: 0,
    skipped: 0,
    failed: 0,
    unsupportedChannelSkipped: 0,
    missingRecipientSkipped: 0,
    duplicateSkipped: 0,
  };
}

function bump(
  totals: DispatchPlannedNotificationsTotals,
  r: NotificationDispatchResult,
): void {
  if (r.outcome === 'sent') totals.sent++;
  else if (r.outcome === 'skipped') totals.skipped++;
  else totals.failed++;
}

function normalizeRecipients(
  raw:
    | NotificationRecipient
    | readonly NotificationRecipient[]
    | null
    | undefined,
): NotificationRecipient[] {
  if (raw == null) return [];
  if (Array.isArray(raw)) {
    return (raw as readonly NotificationRecipient[]).filter(
      (r): r is NotificationRecipient => !!r,
    );
  }
  return [raw as NotificationRecipient];
}

export async function dispatchPlannedNotifications(
  input: DispatchPlannedNotificationsInput,
): Promise<DispatchPlannedNotificationsResult> {
  const plannedCount = input.plan.notifications.length;

  if (input.dryRun !== false) {
    return {
      dispatched: false,
      reason: NOTIFICATION_GATE_REQUIRES_NON_DRY_RUN,
      totals: emptyTotals(plannedCount),
      results: [],
    };
  }
  if (input.enableNotificationWrites !== true) {
    return {
      dispatched: false,
      reason: NOTIFICATION_GATE_REQUIRES_ENABLE_NOTIFICATION_WRITES,
      totals: emptyTotals(plannedCount),
      results: [],
    };
  }
  if (!input.dispatcher) {
    return {
      dispatched: false,
      reason: NOTIFICATION_GATE_REQUIRES_DISPATCHER,
      totals: emptyTotals(plannedCount),
      results: [],
    };
  }
  if (!input.recipientResolver) {
    return {
      dispatched: false,
      reason: NOTIFICATION_GATE_REQUIRES_RESOLVER,
      totals: emptyTotals(plannedCount),
      results: [],
    };
  }

  const dispatcher = input.dispatcher;
  const resolver = input.recipientResolver;
  const build = input.contentBuilder ?? defaultNotificationContent;
  const totals = emptyTotals(plannedCount);
  const results: NotificationDispatchResult[] = [];
  const seenDeliveries = new Set<string>();

  for (const planned of input.plan.notifications) {
    const baseKey = buildNotificationKey(planned);

    // Channel guard. In-app only in this phase.
    if (planned.channel !== 'in_app') {
      const r: NotificationDispatchResult = {
        outcome: 'skipped',
        channel: 'in_app',
        notificationKey: baseKey,
        reason: `unsupported channel: ${planned.channel}`,
      };
      results.push(r);
      bump(totals, r);
      totals.unsupportedChannelSkipped++;
      continue;
    }

    // Resolve recipients (single / array / null) with throw safety.
    let resolved: NotificationRecipient[];
    try {
      const raw = await resolver(planned);
      resolved = normalizeRecipients(raw);
    } catch (err) {
      const r: NotificationDispatchResult = {
        outcome: 'failed',
        channel: 'in_app',
        notificationKey: baseKey,
        error:
          'recipientResolver: ' +
          (err instanceof Error ? err.message : 'unknown error'),
      };
      results.push(r);
      bump(totals, r);
      continue;
    }

    // Dedupe by userId within this planned notification.
    const perPlannedSeen = new Set<string>();
    const unique: NotificationRecipient[] = [];
    let duplicateWithinPlanned = 0;
    for (const r of resolved) {
      if (!r || !r.userId) continue;
      if (perPlannedSeen.has(r.userId)) {
        duplicateWithinPlanned++;
        continue;
      }
      perPlannedSeen.add(r.userId);
      unique.push(r);
    }

    if (unique.length === 0) {
      const r: NotificationDispatchResult = {
        outcome: 'skipped',
        channel: 'in_app',
        notificationKey: baseKey,
        reason: 'no recipient resolved',
      };
      results.push(r);
      bump(totals, r);
      totals.missingRecipientSkipped++;
      totals.duplicateSkipped += duplicateWithinPlanned;
      continue;
    }

    const content = build(planned);

    // Surface duplicates collapsed at recipient-resolution time.
    for (let i = 0; i < duplicateWithinPlanned; i++) {
      const r: NotificationDispatchResult = {
        outcome: 'skipped',
        channel: 'in_app',
        notificationKey: baseKey,
        reason: 'duplicate recipient within planned notification',
      };
      results.push(r);
      bump(totals, r);
      totals.duplicateSkipped++;
    }

    // Fan out: one delivery attempt per unique (planned × userId).
    for (const recipient of unique) {
      const perKey = buildRecipientNotificationKey(planned, recipient.userId);
      if (seenDeliveries.has(perKey)) {
        const r: NotificationDispatchResult = {
          outcome: 'skipped',
          channel: 'in_app',
          notificationKey: perKey,
          recipientUserId: recipient.userId,
          reason: 'duplicate notification key within run',
        };
        results.push(r);
        bump(totals, r);
        totals.duplicateSkipped++;
        continue;
      }
      seenDeliveries.add(perKey);
      totals.deliveriesAttempted++;

      let r: NotificationDispatchResult;
      try {
        r = await dispatcher.dispatch(planned, recipient, content, perKey);
      } catch (err) {
        // Dispatchers should never throw, but if they do, isolate the
        // failure to this delivery and keep the loop running for the
        // remaining recipients of the same planned notification.
        r = {
          outcome: 'failed',
          channel: 'in_app',
          notificationKey: perKey,
          recipientUserId: recipient.userId,
          error:
            'dispatcher threw: ' +
            (err instanceof Error ? err.message : 'unknown error'),
        };
      }
      results.push(r);
      bump(totals, r);
    }
  }

  return { dispatched: true, totals, results };
}