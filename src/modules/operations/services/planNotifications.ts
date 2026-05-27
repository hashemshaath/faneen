/**
 * BUSINESS-OPERATIONS-2D — Pure notification planner.
 *
 * Given a SweepPlan, decide which actions WOULD trigger a notification
 * later. This module does NOT send anything. It returns a list of
 * planned notification descriptors so the orchestrator can log totals
 * and (in a later phase) hand them to a real dispatcher.
 *
 * Rules (additive, safe defaults):
 *   - create   → notify (channel: in_app, severity from action)
 *   - escalate → notify (channel: in_app, severity from action)
 *   - resolve  → notify (channel: in_app, severity: 'info')
 *   - skip-*   → no notification
 */
import type {
  SweepAction,
  SweepPlan,
} from './slaSweep';
import type { OperationalAlertSeverity } from '../constants/alerts';

export type PlannedNotificationChannel = 'in_app';

export interface PlannedNotification {
  channel: PlannedNotificationChannel;
  reason: 'create' | 'escalate' | 'resolve';
  conditionCode: string;
  entityId: string;
  severity: OperationalAlertSeverity;
  idempotencyKey?: string;
  alertId?: string;
}

export interface NotificationPlan {
  totals: {
    planned: number;
    byReason: { create: number; escalate: number; resolve: number };
  };
  notifications: PlannedNotification[];
}

function reasonFor(action: SweepAction): PlannedNotification['reason'] | null {
  if (action.kind === 'create') return 'create';
  if (action.kind === 'escalate') return 'escalate';
  if (action.kind === 'resolve') return 'resolve';
  return null;
}

export function planNotifications(plan: SweepPlan): NotificationPlan {
  const notifications: PlannedNotification[] = [];
  const byReason = { create: 0, escalate: 0, resolve: 0 };
  const seenKeys = new Set<string>();

  for (const action of plan.actions) {
    const reason = reasonFor(action);
    if (!reason) continue;

    // Idempotency: never plan two notifications for the same key/alert.
    const dedupKey =
      action.idempotencyKey ??
      (action.alertId
        ? `alert:${action.alertId}:${reason}`
        : `${reason}:${action.conditionCode}:${action.entityId}`);
    if (seenKeys.has(dedupKey)) continue;
    seenKeys.add(dedupKey);

    const severity: OperationalAlertSeverity =
      reason === 'resolve' ? 'info' : (action.severity ?? 'info');

    notifications.push({
      channel: 'in_app',
      reason,
      conditionCode: action.conditionCode,
      entityId: action.entityId,
      severity,
      idempotencyKey: action.idempotencyKey,
      alertId: action.alertId,
    });
    byReason[reason]++;
  }

  return {
    totals: { planned: notifications.length, byReason },
    notifications,
  };
}