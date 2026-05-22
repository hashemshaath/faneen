export const QUOTE_STATUSES = ['new','under_review','matched','contacted','completed','cancelled'] as const;
export type QuoteStatus = typeof QUOTE_STATUSES[number];

export const QUOTE_STATUS_LABEL_AR: Record<QuoteStatus, string> = {
  new: 'جديد',
  under_review: 'قيد المراجعة',
  matched: 'تم توجيهه لمزودين',
  contacted: 'تم التواصل',
  completed: 'مكتمل',
  cancelled: 'ملغي',
};

export const QUOTE_STATUS_LABEL_EN: Record<QuoteStatus, string> = {
  new: 'New',
  under_review: 'Under review',
  matched: 'Matched',
  contacted: 'Contacted',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

export const QUOTE_STATUS_DESC_AR: Record<QuoteStatus, string> = {
  new: 'تم استلام الطلب وهو بانتظار المراجعة.',
  under_review: 'تتم مراجعة تفاصيل الطلب للتأكد من وضوحها.',
  matched: 'تم توجيه الطلب لمزودين مناسبين حسب القطاع والمدينة.',
  contacted: 'تم التواصل بخصوص الطلب أو بدأت مرحلة المتابعة.',
  completed: 'تم إغلاق الطلب كمكتمل.',
  cancelled: 'تم إلغاء الطلب.',
};

export const QUOTE_STATUS_TONE: Record<QuoteStatus, string> = {
  new: 'bg-primary/10 text-primary border-primary/30',
  under_review: 'bg-warning/10 text-warning border-warning/30',
  matched: 'bg-info/10 text-info border-info/30',
  contacted: 'bg-success/10 text-success border-success/30',
  completed: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30',
  cancelled: 'bg-muted text-muted-foreground border-border',
};

// Provider-side lead status (separate from QuoteRequest workflow)
export const LEAD_STATUSES = ['new','viewed','interested','not_interested','contacted','expired','cancelled'] as const;
export type LeadRequestStatus = typeof LEAD_STATUSES[number];

export const LEAD_STATUS_LABEL_AR: Record<LeadRequestStatus, string> = {
  new: 'جديد',
  viewed: 'تمت المشاهدة',
  interested: 'مهتم',
  not_interested: 'غير مناسب',
  contacted: 'تم التواصل',
  expired: 'منتهي',
  cancelled: 'ملغي',
};

export const LEAD_STATUS_TONE: Record<LeadRequestStatus, string> = {
  new: 'bg-primary/10 text-primary border-primary/30',
  viewed: 'bg-info/10 text-info border-info/30',
  interested: 'bg-success/10 text-success border-success/30',
  not_interested: 'bg-muted text-muted-foreground border-border',
  contacted: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30',
  expired: 'bg-warning/10 text-warning border-warning/30',
  cancelled: 'bg-muted text-muted-foreground border-border',
};