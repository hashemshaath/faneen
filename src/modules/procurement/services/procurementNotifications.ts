/**
 * BUSINESS-WORKFLOW-PROCUREMENT-3 — Safe in-app procurement notifications.
 *
 * Wraps the canonical `createNotificationFireAndForget` notification
 * primitive. NO SMS / email / push / WhatsApp surfaces. NO supplier PII
 * (names, phones, emails) is ever placed in `body_*` — only generic IDs.
 * All functions are public and MUST NOT throw — failure is logged via the
 * underlying fire-and-forget warner.
 */
import { createNotificationFireAndForget } from '@/modules/notifications';

export type ProcurementNotificationEvent =
  | 'rfq_sent'
  | 'quote_submitted'
  | 'quote_shortlisted'
  | 'quote_selected'
  | 'quote_rejected'
  | 'rfq_closed'
  | 'quote_awarded';

export interface ProcurementNotificationInput {
  user_id: string;
  event: ProcurementNotificationEvent;
  rfq_id?: string | null;
  quote_id?: string | null;
  procurement_request_id?: string | null;
}

const BILINGUAL: Record<
  ProcurementNotificationEvent,
  { title_ar: string; title_en: string; body_ar: string; body_en: string }
> = {
  rfq_sent: {
    title_ar: 'تم إرسال طلب عروض',
    title_en: 'RFQ sent',
    body_ar: 'تم إرسال طلب عروض جديد إلى الموردين.',
    body_en: 'A new RFQ has been sent to suppliers.',
  },
  quote_submitted: {
    title_ar: 'تم استلام عرض مورد',
    title_en: 'Supplier quote submitted',
    body_ar: 'تم استلام عرض مورد جديد على طلب العروض.',
    body_en: 'A new supplier quote has been submitted on your RFQ.',
  },
  quote_shortlisted: {
    title_ar: 'إدراج عرض ضمن القائمة المختصرة',
    title_en: 'Quote shortlisted',
    body_ar: 'تم إدراج عرض مورد ضمن القائمة المختصرة.',
    body_en: 'A supplier quote has been shortlisted.',
  },
  quote_selected: {
    title_ar: 'تم اختيار عرض مورد',
    title_en: 'Quote selected',
    body_ar: 'تم اختيار عرض مورد لطلب العروض.',
    body_en: 'A supplier quote has been selected for the RFQ.',
  },
  quote_rejected: {
    title_ar: 'تم رفض عرض مورد',
    title_en: 'Quote rejected',
    body_ar: 'تم رفض عرض مورد على طلب العروض.',
    body_en: 'A supplier quote has been rejected.',
  },
  rfq_closed: {
    title_ar: 'تم إغلاق طلب العروض',
    title_en: 'RFQ closed',
    body_ar: 'تم إغلاق طلب العروض.',
    body_en: 'The RFQ has been closed.',
  },
  quote_awarded: {
    title_ar: 'تم منح طلب الشراء',
    title_en: 'Procurement awarded',
    body_ar: 'تم منح أحد عروض الموردين بنجاح.',
    body_en: 'A supplier quote has been awarded successfully.',
  },
};

export function notifyProcurementEvent(input: ProcurementNotificationInput): void {
  try {
    if (!input?.user_id) return;
    const content = BILINGUAL[input.event];
    if (!content) return;
    const reference_type = input.quote_id
      ? 'procurement_supplier_quote'
      : input.rfq_id
        ? 'procurement_rfq'
        : 'procurement_request';
    const reference_id =
      input.quote_id ?? input.rfq_id ?? input.procurement_request_id ?? undefined;
    createNotificationFireAndForget(
      {
        user_id: input.user_id,
        title_ar: content.title_ar,
        title_en: content.title_en,
        body_ar: content.body_ar,
        body_en: content.body_en,
        notification_type: `procurement.${input.event}`,
        reference_type,
        reference_id,
      },
      `procurement.notify[${input.event}]`,
    );
  } catch {
    // never throw from notification path
  }
}