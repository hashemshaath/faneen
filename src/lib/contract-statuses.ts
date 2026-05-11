/**
 * Centralized contract status configuration.
 *
 * Single source of truth for contract status labels (AR/EN), badge classes,
 * and icons. Replaces the duplicated `statusConfig` maps that previously
 * lived inside Contracts.tsx, ContractDetail.tsx, and DashboardContracts.tsx.
 *
 * Notes:
 * - The DB enum for `contracts.status` uses `pending_approval`, NOT `pending`.
 *   The legacy `pending` entry was dead for contract-level usage and has been
 *   removed here. (`pending` is still used for milestones / amendments — see
 *   `getSecondaryStatusMeta` below for those.)
 * - Keep this file framework-light (no React hooks, no i18n context) so it can
 *   be used safely in PDF/email generators.
 */
import {
  FileText, Clock, CheckCircle2, Shield, XCircle, AlertTriangle,
  Timer, Send,
  type LucideIcon,
} from 'lucide-react';

export type ContractStatus =
  | 'draft'
  | 'pending_approval'
  | 'active'
  | 'completed'
  | 'cancelled'
  | 'disputed';

export const CONTRACT_STATUS_KEYS: ContractStatus[] = [
  'draft', 'pending_approval', 'active', 'completed', 'cancelled', 'disputed',
];

export interface ContractStatusMeta {
  icon: LucideIcon;
  /** Combined bg+text classes for filled badges. */
  badge: string;
  /** Plain text color class (used standalone). */
  text: string;
  /** Border tint for surrounding cards. */
  border: string;
  /** Soft ring for accents. */
  ring: string;
  /** Gradient pair for premium displays. */
  gradient: string;
  label_ar: string;
  label_en: string;
}

const CONTRACT_STATUS_CONFIG: Record<ContractStatus, ContractStatusMeta> = {
  draft: {
    icon: FileText,
    badge: 'bg-muted text-muted-foreground',
    text: 'text-muted-foreground',
    border: 'border-muted-foreground/10',
    ring: 'ring-muted-foreground/20',
    gradient: 'from-slate-400 to-slate-500',
    label_ar: 'مسودة', label_en: 'Draft',
  },
  pending_approval: {
    icon: Clock,
    badge: 'bg-warning text-warning dark:bg-warning/30 dark:text-warning',
    text: 'text-warning',
    border: 'border-warning dark:border-warning/30',
    ring: 'ring-warning/30',
    gradient: 'from-warning to-urgent',
    label_ar: 'بانتظار الموافقة', label_en: 'Pending',
  },
  active: {
    icon: CheckCircle2,
    badge: 'bg-success text-success dark:bg-success/30 dark:text-success',
    text: 'text-success',
    border: 'border-success dark:border-success/30',
    ring: 'ring-success/30',
    gradient: 'from-success to-success',
    label_ar: 'نشط', label_en: 'Active',
  },
  completed: {
    icon: Shield,
    badge: 'bg-info text-info dark:bg-info/30 dark:text-info',
    text: 'text-info',
    border: 'border-info dark:border-info/30',
    ring: 'ring-info/30',
    gradient: 'from-info to-secondary',
    label_ar: 'مكتمل', label_en: 'Completed',
  },
  cancelled: {
    icon: XCircle,
    badge: 'bg-destructive text-destructive dark:bg-destructive/30 dark:text-destructive',
    text: 'text-destructive',
    border: 'border-destructive dark:border-destructive/30',
    ring: 'ring-destructive/30',
    gradient: 'from-destructive to-destructive',
    label_ar: 'ملغي', label_en: 'Cancelled',
  },
  disputed: {
    icon: AlertTriangle,
    badge: 'bg-urgent text-urgent dark:bg-urgent/30 dark:text-urgent',
    text: 'text-urgent',
    border: 'border-urgent dark:border-urgent/30',
    ring: 'ring-urgent/30',
    gradient: 'from-urgent to-destructive',
    label_ar: 'نزاع', label_en: 'Disputed',
  },
};

/** Always returns a config — falls back to `draft` when unknown. */
export function getContractStatusMeta(status: string | null | undefined): ContractStatusMeta {
  if (!status) return CONTRACT_STATUS_CONFIG.draft;
  return (CONTRACT_STATUS_CONFIG as Record<string, ContractStatusMeta>)[status] ?? CONTRACT_STATUS_CONFIG.draft;
}

export function getContractStatusLabel(status: string | null | undefined, isRTL: boolean): string {
  const meta = getContractStatusMeta(status);
  return isRTL ? meta.label_ar : meta.label_en;
}

/**
 * Lifecycle-locked statuses — once a contract reaches one of these,
 * it should not be edited freely (UI guard; DB lock comes in C6).
 */
export const LOCKED_CONTRACT_STATUSES: ContractStatus[] = ['active', 'completed', 'cancelled'];
export function isContractLockedByStatus(status: string | null | undefined): boolean {
  return !!status && (LOCKED_CONTRACT_STATUSES as string[]).includes(status);
}

/* ── Secondary statuses (milestones, payments, amendments, measurements) ──
 * These are NOT part of the contracts.status enum, but are referenced from
 * the same UI files. They live here so all status labels share one source.
 */
export interface SecondaryStatusMeta {
  icon: LucideIcon;
  badge: string;
  text: string;
  label_ar: string;
  label_en: string;
}

const SECONDARY_STATUS_CONFIG: Record<string, SecondaryStatusMeta> = {
  pending:     { icon: Clock,         text: 'text-warning',     badge: 'bg-warning text-warning dark:bg-warning/30 dark:text-warning',           label_ar: 'معلق',     label_en: 'Pending' },
  in_progress: { icon: Timer,         text: 'text-info',        badge: 'bg-info text-info dark:bg-info/30 dark:text-info',                       label_ar: 'قيد التنفيذ', label_en: 'In Progress' },
  paid:        { icon: CheckCircle2,  text: 'text-success',     badge: 'bg-success text-success dark:bg-success/30 dark:text-success',           label_ar: 'مسدد',     label_en: 'Paid' },
  overdue:     { icon: AlertTriangle, text: 'text-destructive', badge: 'bg-destructive text-destructive dark:bg-destructive/30 dark:text-destructive', label_ar: 'متأخر',    label_en: 'Overdue' },
  submitted:   { icon: Send,          text: 'text-warning',     badge: 'bg-warning text-warning dark:bg-warning/30 dark:text-warning',           label_ar: 'مرسل',     label_en: 'Submitted' },
  expired:     { icon: XCircle,       text: 'text-destructive', badge: 'bg-destructive text-destructive dark:bg-destructive/30 dark:text-destructive', label_ar: 'منتهي',    label_en: 'Expired' },
  installed:   { icon: CheckCircle2,  text: 'text-success',     badge: 'bg-success text-success dark:bg-success/30 dark:text-success',           label_ar: 'مركّب',    label_en: 'Installed' },
  approved:    { icon: CheckCircle2,  text: 'text-success',     badge: 'bg-success text-success dark:bg-success/30 dark:text-success',           label_ar: 'معتمد',    label_en: 'Approved' },
  rejected:    { icon: XCircle,       text: 'text-destructive', badge: 'bg-destructive text-destructive dark:bg-destructive/30 dark:text-destructive', label_ar: 'مرفوض',    label_en: 'Rejected' },
};

/** Returns secondary (non-contract) status meta or a safe muted fallback. */
export function getSecondaryStatusMeta(status: string | null | undefined): SecondaryStatusMeta {
  if (!status) return { icon: FileText, text: 'text-muted-foreground', badge: 'bg-muted text-muted-foreground', label_ar: '—', label_en: '—' };
  return SECONDARY_STATUS_CONFIG[status] ?? { icon: FileText, text: 'text-muted-foreground', badge: 'bg-muted text-muted-foreground', label_ar: status, label_en: status };
}

/* ── Display helpers ── */
export function formatContractNumber(num: string | null | undefined): string {
  return num ? `#${num}` : '—';
}

export function vatStatusLabel(vatInclusive: boolean, isRTL: boolean): string {
  if (vatInclusive) return isRTL ? 'الأسعار شاملة الضريبة' : 'Prices include VAT';
  return isRTL ? 'الضريبة تضاف على المجموع' : 'VAT added to total';
}