import type { RentalUnit, RentalOrderStatus, RentalItemStatus, RentalExtensionType } from './types';

export const RENTAL_UNITS: ReadonlyArray<{ value: RentalUnit; ar: string; en: string }> = [
  { value: 'day', ar: 'يوم', en: 'Day' },
  { value: 'hour', ar: 'ساعة', en: 'Hour' },
  { value: 'piece', ar: 'قطعة', en: 'Piece' },
  { value: 'm', ar: 'متر', en: 'Meter' },
  { value: 'm2', ar: 'متر مربع', en: 'Square Meter' },
  { value: 'unit', ar: 'وحدة', en: 'Unit' },
];

export const ORDER_STATUS_TONES: Record<RentalOrderStatus, 'primary' | 'amber' | 'red' | 'emerald' | 'muted'> = {
  draft: 'muted',
  active: 'emerald',
  expiring_soon: 'amber',
  expired: 'red',
  extended: 'primary',
  renewed: 'primary',
  closed: 'muted',
  cancelled: 'muted',
};

export const ORDER_STATUS_LABELS: Record<RentalOrderStatus, { ar: string; en: string }> = {
  draft: { ar: 'مسودة', en: 'Draft' },
  active: { ar: 'نشط', en: 'Active' },
  expiring_soon: { ar: 'يقترب الانتهاء', en: 'Expiring soon' },
  expired: { ar: 'منتهي', en: 'Expired' },
  extended: { ar: 'مُمَدد', en: 'Extended' },
  renewed: { ar: 'مُجدد', en: 'Renewed' },
  closed: { ar: 'مغلق', en: 'Closed' },
  cancelled: { ar: 'ملغي', en: 'Cancelled' },
};

export const ITEM_STATUS_LABELS: Record<RentalItemStatus, { ar: string; en: string }> = {
  draft: { ar: 'مسودة', en: 'Draft' },
  pending_review: { ar: 'بانتظار المراجعة', en: 'Pending review' },
  approved: { ar: 'معتمد', en: 'Approved' },
  rejected: { ar: 'مرفوض', en: 'Rejected' },
  archived: { ar: 'مؤرشف', en: 'Archived' },
};

export const EXTENSION_TYPE_LABELS: Record<RentalExtensionType, { ar: string; en: string }> = {
  full: { ar: 'تمديد كامل', en: 'Full extension' },
  partial: { ar: 'تمديد جزئي', en: 'Partial extension' },
  duration_only: { ar: 'تمديد مدة فقط', en: 'Duration only' },
  quantity_only: { ar: 'تمديد كمية فقط', en: 'Quantity only' },
};