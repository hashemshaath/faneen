/**
 * BUSINESS-OPERATIONS-2H — Gated planned-notification dispatcher.
 *
 * Walks a `NotificationPlan` (produced by `planNotifications`) and hands
 * each entry to the injected `NotificationDispatcher`.
 *
 * Safety gate (fails closed):
 *   - Requires `dryRun: false` AND `enableNotificationWrites: true` AND
 *     a non-null `dispatcher`. Any missing prerequisite → returns
 *     `dispatched: false` with the gate reason; the dispatcher is never
 *     invoked. This gate is INDEPENDENT of the alert-write gate
 *     (`enableWrites`) so notifications can be held back even when alert
 *     writes are live.
 *
 * Per-run guarantees:
 *   - Duplicate `notificationKey`s within a run are skipped (idempotent).
 *   - Missing/unresolved recipients are skipped (never failed).
 *   - Individual dispatch failures do NOT abort the loop and do NOT
 *     mutate alerts or other notifications.
 *
 * Channel: in_app only. Other surfaces are out of scope here.
 */
import type { NotificationPlan, PlannedNotification } from './planNotifications';
import {
  buildNotificationKey,
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

export type NotificationRecipientResolver = (
  planned: PlannedNotification,
) => NotificationRecipient | null | Promise<NotificationRecipient | null>;

export interface DispatchPlannedNotificationsInput {
  plan: NotificationPlan;
  dispatcher?: NotificationDispatcher;
  recipientResolver?: NotificationRecipientResolver;
  contentBuilder?: NotificationContentBuilder;
  dryRun: boolean;
  enableNotificationWrites: boolean;
}

export interface DispatchPlannedNotificationsTotals {
  planned: number;
  sent: number;
  skipped: number;
  failed: number;
}

export interface DispatchPlannedNotificationsResult {
  dispatched: boolean;
  reason?: string;
  totals: DispatchPlannedNotificationsTotals;
  results: NotificationDispatchResult[];
}

function emptyTotals(planned: number): DispatchPlannedNotificationsTotals {
  return { planned, sent: 0, skipped: 0, failed: 0 };
}

function bump(
  totals: DispatchPlannedNotificationsTotals,
  r: NotificationDispatchResult,
): void {
  if (r.outcome === 'sent') totals.sent++;
  else if (r.outcome === 'skipped') totals.skipped++;
  else totals.failed++;
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

  const build = input.contentBuilder ?? defaultNotificationContent;
  const totals = emptyTotals(plannedCount);
  const results: NotificationDispatchResult[] = [];
  const seen = new Set<string>();

  for (const planned of input.plan.notifications) {
    const key = buildNotificationKey(planned);

    if (seen.has(key)) {
      const r: NotificationDispatchResult = {
        outcome: 'skipped',
        channel: 'in_app',
        notificationKey: key,
        reason: 'duplicate notification key within run',
      };
      results.push(r);
      bump(totals, r);
      continue;
    }
    seen.add(key);

    let recipient: NotificationRecipient | null = null;
    try {
      recipient = (await input.recipientResolver(planned)) ?? null;
    } catch (err) {
      const r: NotificationDispatchResult = {
        outcome: 'failed',
        channel: 'in_app',
        notificationKey: key,
        error:
          'recipientResolver: ' +
          (err instanceof Error ? err.message : 'unknown error'),
      };
      results.push(r);
      bump(totals, r);
      continue;
    }

    if (!recipient || !recipient.userId) {
      const r: NotificationDispatchResult = {
        outcome: 'skipped',
        channel: 'in_app',
        notificationKey: key,
        reason: 'no recipient resolved',
      };
      results.push(r);
      bump(totals, r);
      continue;
    }

    const content = build(planned);
    const r = await input.dispatcher.dispatch(planned, recipient, content, key);
    results.push(r);
    bump(totals, r);
  }

  return { dispatched: true, totals, results };
}