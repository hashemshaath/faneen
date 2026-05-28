/**
 * BUSINESS-OPS-METRICS-1 — Bilingual labels for operational metric cards.
 * Pure data, no I/O.
 */

export interface BiLabel { en: string; ar: string; }

export const OPERATIONAL_METRIC_LABELS = {
  // Work Orders
  woOpen: { en: 'Open Work Orders', ar: 'أوامر العمل المفتوحة' },
  woCompleted: { en: 'Completed (window)', ar: 'مكتملة (النطاق)' },
  woOverdue: { en: 'Overdue', ar: 'متأخرة' },
  woHigh: { en: 'High / Urgent', ar: 'عالية / عاجلة' },
  woUnassigned: { en: 'Unassigned (open)', ar: 'غير مُسندة (مفتوحة)' },
  woAvgAge: { en: 'Avg age (open)', ar: 'متوسط عمر المفتوحة' },
  woAvgCycle: { en: 'Avg cycle time', ar: 'متوسط زمن الإنجاز' },
  // Leads / Quotes
  ledNew: { en: 'New leads', ar: 'طلبات جديدة' },
  ledStatus: { en: 'Lead status changes', ar: 'تغييرات حالة الطلبات' },
  qteResponded: { en: 'Quotes responded', ar: 'عروض تمت الإجابة عليها' },
  ledToWo: { en: 'Lead → Work Order', ar: 'طلب ← أمر عمل' },
  qteToWo: { en: 'Quote → Work Order', ar: 'عرض سعر ← أمر عمل' },
  // Contracts
  cntCreated: { en: 'Contracts created', ar: 'عقود مُنشأة' },
  cntStatus: { en: 'Contract status changes', ar: 'تغييرات حالة العقود' },
  cntSigned: { en: 'Contracts signed', ar: 'عقود موقعة' },
  cntToWo: { en: 'Contract → Work Order', ar: 'عقد ← أمر عمل' },
  // Bookings
  bkgCreated: { en: 'Bookings created', ar: 'حجوزات مُنشأة' },
  bkgStatus: { en: 'Booking status changes', ar: 'تغييرات حالة الحجوزات' },
  bkgToWo: { en: 'Booking → Work Order', ar: 'حجز ← أمر عمل' },
  // Admin support
  notesOpen: { en: 'Open admin notes', ar: 'ملاحظات إدارية مفتوحة' },
  notesCritical: { en: 'Critical notes', ar: 'ملاحظات حرجة' },
  notesStale: { en: 'Stale > 7d', ar: 'قديمة > 7 أيام' },
  // Sections
  sectionWO: { en: 'Work Orders', ar: 'أوامر العمل' },
  sectionLeadsQuotes: { en: 'Leads & Quotes', ar: 'الطلبات وعروض الأسعار' },
  sectionContracts: { en: 'Contracts', ar: 'العقود' },
  sectionBookings: { en: 'Bookings', ar: 'الحجوزات' },
  sectionSupport: { en: 'Admin Support', ar: 'دعم المسؤولين' },
  approxHint: {
    en: 'Approximate — current window (≤ recent events).',
    ar: 'تقريبي — ضمن النطاق الحالي (الأحداث الأخيرة).',
  },
} as const satisfies Record<string, BiLabel>;

export type OperationalMetricLabelKey = keyof typeof OPERATIONAL_METRIC_LABELS;

export function pickMetricLabel(
  key: OperationalMetricLabelKey,
  isRTL: boolean,
): string {
  const l = OPERATIONAL_METRIC_LABELS[key];
  return isRTL ? l.ar : l.en;
}