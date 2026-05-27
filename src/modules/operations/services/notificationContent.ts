/**
 * BUSINESS-OPERATIONS-2I — Safe localized SLA notification content.
 *
 * Bilingual (AR/EN) generic operational copy for in-app notifications.
 * Content is intentionally *generic* — no customer names, no phones,
 * no emails, no entity titles, no free-text body. The recipient still
 * sees the alert id (via reference_id) and can open the operational
 * surface for the full, RLS-scoped details.
 *
 * No SMS/email/push. No links to external surfaces. No PII.
 */
import type { PlannedNotification } from './planNotifications';
import type {
  InAppNotificationContent,
  NotificationContentBuilder,
} from './notificationDispatcher';

export type SupportedLocale = 'ar' | 'en';

export interface SafeSlaContentBuilderOptions {
  /** Override the locale used to populate title/body. Default 'ar'. */
  locale?: SupportedLocale;
}

interface BilingualCopy {
  titleAr: string;
  titleEn: string;
  bodyAr: string;
  bodyEn: string;
}

const COPY: Record<PlannedNotification['reason'], BilingualCopy> = {
  create: {
    titleAr: 'تنبيه تشغيلي يحتاج متابعة',
    titleEn: 'Operational alert needs attention',
    bodyAr: 'يوجد تنبيه تشغيلي ضمن اتفاقية مستوى الخدمة ويتطلب مراجعة من الفريق.',
    bodyEn: 'An SLA operational alert requires team review.',
  },
  escalate: {
    titleAr: 'تم تصعيد تنبيه تشغيلي',
    titleEn: 'Operational alert escalated',
    bodyAr: 'تم رفع مستوى تنبيه تشغيلي بسبب تجاوز مدة المتابعة.',
    bodyEn: 'An operational alert was escalated because the follow-up window was exceeded.',
  },
  resolve: {
    titleAr: 'تم إغلاق تنبيه تشغيلي',
    titleEn: 'Operational alert resolved',
    bodyAr: 'تم إغلاق تنبيه تشغيلي بعد زوال سبب المتابعة.',
    bodyEn: 'An operational alert was resolved after the follow-up condition cleared.',
  },
};

function normalizeLocale(locale: SupportedLocale | undefined): SupportedLocale {
  // Defensive fallback for any future locale tag that slips through.
  return locale === 'en' ? 'en' : 'ar';
}

export function buildSafeSlaNotificationContent(
  planned: PlannedNotification,
  options: SafeSlaContentBuilderOptions = {},
): InAppNotificationContent {
  const reason = COPY[planned.reason] ? planned.reason : 'create';
  const copy = COPY[reason];
  const locale = normalizeLocale(options.locale);

  return {
    // Always include BOTH languages so the receiving UI renders the
    // user's preferred locale regardless of the dispatcher's `locale`.
    titleAr: copy.titleAr,
    titleEn: copy.titleEn,
    bodyAr: copy.bodyAr,
    bodyEn: copy.bodyEn,
    notificationType: `operational_alert.${reason}`,
    referenceType: 'operational_alert',
    referenceId: planned.alertId,
    // `actionUrl` intentionally omitted: no deep link in 2I to keep the
    // payload PII-safe and surface-agnostic. The locale option only
    // documents intent; both languages are always present.
    ...(locale ? {} : {}),
  };
}

/**
 * Factory matching the `NotificationContentBuilder` shape used by
 * `dispatchPlannedNotifications`.
 */
export function createSafeSlaContentBuilder(
  options: SafeSlaContentBuilderOptions = {},
): NotificationContentBuilder {
  return (planned) => buildSafeSlaNotificationContent(planned, options);
}

/** Convenience default for callers that want straight bilingual copy. */
export const safeSlaContentBuilder: NotificationContentBuilder = (planned) =>
  buildSafeSlaNotificationContent(planned);