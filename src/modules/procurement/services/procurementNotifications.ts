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
  | 'quote_awarded'
  | 'brand_equivalent_proposed'
  | 'brand_equivalent_approved'
  | 'brand_equivalent_rejected';

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
  brand_equivalent_proposed: {
    title_ar: 'تم اقتراح علامة بديلة',
    title_en: 'Equivalent brand proposed',
    body_ar: 'اقترح مورد علامة بديلة على أحد بنود طلب العروض، بانتظار المراجعة.',
    body_en: 'A supplier proposed an equivalent brand on an RFQ line — review pending.',
  },
  brand_equivalent_approved: {
    title_ar: 'تمت الموافقة على العلامة البديلة',
    title_en: 'Equivalent brand approved',
    body_ar: 'تمت الموافقة على علامة بديلة مقترحة لأحد بنود طلب العروض.',
    body_en: 'An equivalent brand proposal has been approved.',
  },
  brand_equivalent_rejected: {
    title_ar: 'تم رفض العلامة البديلة',
    title_en: 'Equivalent brand rejected',
    body_ar: 'تم رفض علامة بديلة مقترحة لأحد بنود طلب العروض.',
    body_en: 'An equivalent brand proposal has been rejected.',
  },
};

export function notifyProcurementEvent(input: ProcurementNotificationInput): void {
  try {
    if (!input?.user_id) return;
    const content = BILINGUAL[input.event];
    if (!content) return;
    // RFQ-BRAND-PICKER-1F — collapse duplicate same-state notifications fired
    // within a short window (e.g. double-clicking approve). Pure in-memory,
    // best-effort, never throws.
    if (!shouldEmitNotification(input)) return;
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

// RFQ-BRAND-PICKER-1F — tiny in-memory dedupe cache (per process).
const NOTIF_DEDUPE_WINDOW_MS = 5_000;
const _notifDedupe = new Map<string, number>();
function shouldEmitNotification(input: ProcurementNotificationInput): boolean {
  try {
    const key = [
      input.user_id,
      input.event,
      input.quote_id ?? '',
      input.rfq_id ?? '',
      input.procurement_request_id ?? '',
    ].join('|');
    const now = Date.now();
    const last = _notifDedupe.get(key);
    if (last !== undefined && now - last < NOTIF_DEDUPE_WINDOW_MS) return false;
    _notifDedupe.set(key, now);
    // Bound the cache.
    if (_notifDedupe.size > 256) {
      const cutoff = now - NOTIF_DEDUPE_WINDOW_MS;
      for (const [k, t] of _notifDedupe) if (t < cutoff) _notifDedupe.delete(k);
    }
    return true;
  } catch {
    return true;
  }
}