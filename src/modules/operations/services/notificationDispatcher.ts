/**
 * BUSINESS-OPERATIONS-2H — Approved in-app notification dispatch wrappers.
 *
 * This file is the ONLY app-side entrypoint that turns a
 * `PlannedNotification` (from `planNotifications`) into an actual in-app
 * notification row. It is intentionally narrow:
 *
 *   - Channel is `in_app` ONLY. No SMS, email, push, webhook, or
 *     transactional-email surfaces are touched here.
 *   - The Supabase-backed sink delegates to the canonical
 *     `createNotification` wrapper in `@/modules/notifications` — the
 *     notifications-insert isolation audit remains the single source of
 *     truth for `notifications` inserts.
 *   - Tests inject a fake `InAppNotificationSink` (or a fake dispatcher
 *     directly) instead of stubbing the global Supabase client.
 *
 * No mutation of source-domain records. No realtime broadcasts. No cron.
 */
import {
  createNotification,
  type CreateNotificationPayload,
} from '@/modules/notifications';
import type { PlannedNotification } from './planNotifications';

export type NotificationDispatchOutcome = 'sent' | 'skipped' | 'failed';

export interface NotificationDispatchResult {
  outcome: NotificationDispatchOutcome;
  channel: 'in_app';
  notificationKey: string;
  recipientUserId?: string;
  reason?: string;
  error?: string;
}

export interface NotificationRecipient {
  userId: string;
}

export interface InAppNotificationContent {
  titleAr: string;
  titleEn: string;
  bodyAr?: string;
  bodyEn?: string;
  notificationType?: string;
  referenceType?: string;
  referenceId?: string;
  actionUrl?: string;
}

export type NotificationContentBuilder = (
  planned: PlannedNotification,
) => InAppNotificationContent;

export interface InAppNotificationSink {
  insert(
    payload: CreateNotificationPayload,
  ): Promise<{ error?: { message: string } | null }>;
}

export interface NotificationDispatcher {
  dispatch(
    planned: PlannedNotification,
    recipient: NotificationRecipient,
    content: InAppNotificationContent,
    notificationKey: string,
  ): Promise<NotificationDispatchResult>;
}

/**
 * Stable per-notification idempotency key. Combines the underlying
 * action's idempotency / alert identity with the dispatch reason so a
 * single run never produces duplicate in-app notifications.
 */
export function buildNotificationKey(planned: PlannedNotification): string {
  const base =
    planned.idempotencyKey ??
    (planned.alertId
      ? `alert:${planned.alertId}`
      : `${planned.conditionCode}:${planned.entityId}`);
  return `notif:${base}:${planned.reason}`;
}

/**
 * Safe placeholder content — condition code only. Real localized copy is
 * the caller's responsibility via `contentBuilder`. NEVER include PII
 * (names, phones, emails, lead/contract content) in the default.
 */
export function defaultNotificationContent(
  planned: PlannedNotification,
): InAppNotificationContent {
  return {
    titleAr: planned.conditionCode,
    titleEn: planned.conditionCode,
    notificationType: `operational_alert.${planned.reason}`,
    referenceType: 'operational_alert',
    referenceId: planned.alertId,
  };
}

/**
 * Build the default in-app notification dispatcher. Tests should inject
 * a fake `sink` instead of stubbing the global client.
 */
export function createInAppNotificationDispatcher(
  deps: { sink?: InAppNotificationSink } = {},
): NotificationDispatcher {
  const sink: InAppNotificationSink =
    deps.sink ?? {
      insert: (payload) =>
        createNotification(payload) as Promise<{
          error?: { message: string } | null;
        }>,
    };
  return {
    async dispatch(planned, recipient, content, notificationKey) {
      const baseResult = {
        channel: 'in_app' as const,
        notificationKey,
        recipientUserId: recipient.userId,
      };
      try {
        const payload: CreateNotificationPayload = {
          user_id: recipient.userId,
          title_ar: content.titleAr,
          title_en: content.titleEn,
          body_ar: content.bodyAr,
          body_en: content.bodyEn,
          notification_type:
            content.notificationType ?? `operational_alert.${planned.reason}`,
          reference_type: content.referenceType ?? 'operational_alert',
          reference_id: content.referenceId ?? planned.alertId,
          action_url: content.actionUrl,
        };
        const res = await sink.insert(payload);
        if (res?.error) {
          return { ...baseResult, outcome: 'failed', error: res.error.message };
        }
        return { ...baseResult, outcome: 'sent' };
      } catch (err) {
        return {
          ...baseResult,
          outcome: 'failed',
          error: err instanceof Error ? err.message : 'unknown dispatch error',
        };
      }
    },
  };
}