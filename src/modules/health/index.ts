/**
 * BUSINESS-FINISHING-1 Phase D — Operational Health.
 *
 * Pure helpers + bilingual labels + semantic-token tone classes for
 * Work Orders, Contracts, RFQs, and Quotations. No Supabase calls,
 * no side effects. UI consumes these via <HealthBadge />.
 */

export type WorkOrderHealth = 'on_track' | 'due_soon' | 'overdue' | 'completed';
export type ContractHealth = 'draft' | 'active' | 'delayed' | 'completed' | 'cancelled';
export type RfqHealth = 'open' | 'awarded' | 'expired';
export type QuotationHealth = 'draft' | 'sent' | 'approved' | 'rejected' | 'expired';

export interface HealthBi { ar: string; en: string }

const DAY_MS = 24 * 60 * 60 * 1000;
const DUE_SOON_MS = 3 * DAY_MS;

/** Pure: derive Work Order health from status + due date. */
export function workOrderHealth(
  status: string | null | undefined,
  dueAt: string | null | undefined,
  now: number = Date.now(),
): WorkOrderHealth {
  if (status === 'completed' || status === 'cancelled') return 'completed';
  if (!dueAt) return 'on_track';
  const t = new Date(dueAt).getTime();
  if (Number.isNaN(t)) return 'on_track';
  if (t < now) return 'overdue';
  if (t - now <= DUE_SOON_MS) return 'due_soon';
  return 'on_track';
}

/** Pure: derive Contract health from status + expected completion date. */
export function contractHealth(
  status: string | null | undefined,
  expectedCompletionAt: string | null | undefined,
  now: number = Date.now(),
): ContractHealth {
  if (status === 'cancelled') return 'cancelled';
  if (status === 'completed' || status === 'closed') return 'completed';
  if (status === 'draft' || status === 'pending' || status === 'pending_signature') return 'draft';
  if (expectedCompletionAt) {
    const t = new Date(expectedCompletionAt).getTime();
    if (!Number.isNaN(t) && t < now) return 'delayed';
  }
  return 'active';
}

/** Pure: derive RFQ health from status + expiry. */
export function rfqHealth(
  status: string | null | undefined,
  expiresAt: string | null | undefined,
  now: number = Date.now(),
): RfqHealth {
  if (status === 'awarded') return 'awarded';
  if (status === 'cancelled') return 'expired';
  if (expiresAt) {
    const t = new Date(expiresAt).getTime();
    if (!Number.isNaN(t) && t < now) return 'expired';
  }
  if (status === 'closed') return 'expired';
  return 'open';
}

/** Pure: derive Quotation health from status + expiry. */
export function quotationHealth(
  status: string | null | undefined,
  expiresAt: string | null | undefined,
  now: number = Date.now(),
): QuotationHealth {
  if (status === 'approved' || status === 'accepted') return 'approved';
  if (status === 'rejected') return 'rejected';
  if (status === 'draft') return 'draft';
  if (expiresAt) {
    const t = new Date(expiresAt).getTime();
    if (!Number.isNaN(t) && t < now) return 'expired';
  }
  if (status === 'sent' || status === 'pending') return 'sent';
  return 'draft';
}

export const WORK_ORDER_HEALTH_LABELS: Record<WorkOrderHealth, HealthBi> = {
  on_track:  { ar: 'في الموعد', en: 'On track' },
  due_soon:  { ar: 'يقترب موعدها', en: 'Due soon' },
  overdue:   { ar: 'متأخر',     en: 'Overdue' },
  completed: { ar: 'مكتمل',     en: 'Completed' },
};

export const CONTRACT_HEALTH_LABELS: Record<ContractHealth, HealthBi> = {
  draft:     { ar: 'مسودة',  en: 'Draft' },
  active:    { ar: 'نشط',    en: 'Active' },
  delayed:   { ar: 'متأخر',  en: 'Delayed' },
  completed: { ar: 'مكتمل',  en: 'Completed' },
  cancelled: { ar: 'ملغي',   en: 'Cancelled' },
};

export const RFQ_HEALTH_LABELS: Record<RfqHealth, HealthBi> = {
  open:    { ar: 'مفتوح',    en: 'Open' },
  awarded: { ar: 'تم الترسية', en: 'Awarded' },
  expired: { ar: 'منتهي',    en: 'Expired' },
};

export const QUOTATION_HEALTH_LABELS: Record<QuotationHealth, HealthBi> = {
  draft:    { ar: 'مسودة',  en: 'Draft' },
  sent:     { ar: 'مُرسل',  en: 'Sent' },
  approved: { ar: 'معتمد',  en: 'Approved' },
  rejected: { ar: 'مرفوض',  en: 'Rejected' },
  expired:  { ar: 'منتهي',  en: 'Expired' },
};

const ON_TRACK = 'bg-success/10 text-success border-success/30';
const WARN     = 'bg-warning/10 text-warning border-warning/30';
const DANGER   = 'bg-destructive/10 text-destructive border-destructive/30';
const INFO     = 'bg-info/10 text-info border-info/30';
const NEUTRAL  = 'bg-muted text-muted-foreground border-border/60';
const MUTED    = 'bg-muted/60 text-muted-foreground border-border/40';

export const WORK_ORDER_HEALTH_TONE: Record<WorkOrderHealth, string> = {
  on_track:  ON_TRACK,
  due_soon:  WARN,
  overdue:   DANGER,
  completed: MUTED,
};

export const CONTRACT_HEALTH_TONE: Record<ContractHealth, string> = {
  draft:     NEUTRAL,
  active:    INFO,
  delayed:   DANGER,
  completed: ON_TRACK,
  cancelled: MUTED,
};

export const RFQ_HEALTH_TONE: Record<RfqHealth, string> = {
  open:    INFO,
  awarded: ON_TRACK,
  expired: MUTED,
};

export const QUOTATION_HEALTH_TONE: Record<QuotationHealth, string> = {
  draft:    NEUTRAL,
  sent:     INFO,
  approved: ON_TRACK,
  rejected: DANGER,
  expired:  MUTED,
};

export function pickHealthLabel(label: HealthBi | undefined, isRTL: boolean): string {
  if (!label) return '';
  return isRTL ? label.ar : label.en;
}