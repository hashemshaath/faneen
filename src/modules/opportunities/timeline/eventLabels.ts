/**
 * R1 — Central Arabic label map for quote_request_events.event_type
 * strings. Consumed by any event-feed renderer (existing feeds fall back
 * to the raw event_type when a key is missing).
 */
export const OPPORTUNITY_EVENT_LABEL_AR: Record<string, string> = {
  'rfq.award_reason_set': 'تم توثيق سبب الترسية',
  'bid.shortlisted': 'أُدرج العرض ضمن القائمة القصيرة',
  'bid.unshortlisted': 'أُزيل العرض من القائمة القصيرة',
  'opportunity_bid_declined': 'تم إبلاغ المورّد باعتذار مهذّب بعد الترسية',
  'opportunity_bid_submitted': 'تم تقديم عرض جديد',
  'opportunity_bid_shortlisted': 'إشعار المورّد بإدراج عرضه في القائمة القصيرة',
  'opportunity_bid_awarded': 'تم تعميد عرض فائز',
  // R3 — sample track
  'sample.requested': 'طلب العميل عينة قبل التعاقد',
  'sample.shipped': 'شحن المورّد العينة',
  'sample.received': 'استلم العميل العينة',
  'sample.approved': 'اعتمد العميل العينة',
  'sample.rejected': 'رفض العميل العينة',
  // R4 — clarifications + revisions
  'clarification.posted': 'رسالة توضيحية جديدة',
  'bid.revision_requested': 'طلب العميل تعديل العرض',
  'bid.revised': 'قدّم المورّد عرضاً معدّلاً',
};

export function labelForOpportunityEvent(eventType: string | null | undefined): string {
  if (!eventType) return '';
  return OPPORTUNITY_EVENT_LABEL_AR[eventType] ?? eventType;
}