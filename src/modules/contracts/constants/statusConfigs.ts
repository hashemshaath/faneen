import React from 'react';
import {
  Clock,
  Timer,
  CheckCircle2,
  AlertTriangle,
  Send,
  XCircle,
  StickyNote,
  PenTool,
  ListChecks,
} from 'lucide-react';
import { getContractStatusMeta } from '@/lib/contract-statuses';

export const statusConfig: Record<
  string,
  { icon: React.ElementType; color: string; bg: string; label_ar: string; label_en: string }
> = {
  // ── Contract statuses (mirrored from contract-statuses.ts) ──
  ...(Object.fromEntries(
    ['draft', 'pending_approval', 'active', 'completed', 'cancelled', 'disputed'].map((k) => {
      const m = getContractStatusMeta(k);
      return [k, { icon: m.icon, color: m.text, bg: m.badge, label_ar: m.label_ar, label_en: m.label_en }];
    }),
  ) as Record<string, { icon: React.ElementType; color: string; bg: string; label_ar: string; label_en: string }>),
  // ── Secondary statuses (milestones / payments / measurements / amendments) ──
  pending: { icon: Clock, color: 'text-warning', bg: 'bg-warning text-warning dark:bg-warning/30 dark:text-warning', label_ar: 'معلق', label_en: 'Pending' },
  in_progress: { icon: Timer, color: 'text-info', bg: 'bg-info text-info dark:bg-info/30 dark:text-info', label_ar: 'قيد التنفيذ', label_en: 'In Progress' },
  paid: { icon: CheckCircle2, color: 'text-success', bg: 'bg-success text-success dark:bg-success/30 dark:text-success', label_ar: 'مسدد', label_en: 'Paid' },
  overdue: { icon: AlertTriangle, color: 'text-destructive', bg: 'bg-destructive text-destructive dark:bg-destructive/30 dark:text-destructive', label_ar: 'متأخر', label_en: 'Overdue' },
  submitted: { icon: Send, color: 'text-warning', bg: 'bg-warning text-warning dark:bg-warning/30 dark:text-warning', label_ar: 'مرسل', label_en: 'Submitted' },
  expired: { icon: XCircle, color: 'text-destructive', bg: 'bg-destructive text-destructive dark:bg-destructive/30 dark:text-destructive', label_ar: 'منتهي', label_en: 'Expired' },
  installed: { icon: CheckCircle2, color: 'text-success', bg: 'bg-success text-success dark:bg-success/30 dark:text-success', label_ar: 'مركّب', label_en: 'Installed' },
};

export const priorityConfig: Record<string, { bg: string; label_ar: string; label_en: string }> = {
  low: { bg: 'bg-muted text-muted-foreground', label_ar: 'منخفض', label_en: 'Low' },
  medium: { bg: 'bg-info text-info dark:bg-info/30 dark:text-info', label_ar: 'متوسط', label_en: 'Medium' },
  high: { bg: 'bg-urgent text-urgent dark:bg-urgent/30 dark:text-urgent', label_ar: 'عالي', label_en: 'High' },
  urgent: { bg: 'bg-destructive text-destructive dark:bg-destructive/30 dark:text-destructive', label_ar: 'عاجل', label_en: 'Urgent' },
};

export const noteTypeConfig: Record<
  string,
  { label_ar: string; label_en: string; color: string; icon: React.ElementType }
> = {
  general: { label_ar: 'ملاحظة عامة', label_en: 'General', color: 'border-border', icon: StickyNote },
  note: { label_ar: 'ملاحظة', label_en: 'Note', color: 'border-border', icon: StickyNote },
  amendment: { label_ar: 'طلب تعديل', label_en: 'Amendment', color: 'border-warning dark:border-warning/30', icon: PenTool },
  technical_issue: { label_ar: 'ملاحظة فنية', label_en: 'Technical Issue', color: 'border-destructive dark:border-destructive/30', icon: AlertTriangle },
  issue: { label_ar: 'مشكلة', label_en: 'Issue', color: 'border-destructive dark:border-destructive/30', icon: AlertTriangle },
  delivery_report: { label_ar: 'محضر تسليم', label_en: 'Delivery Report', color: 'border-success dark:border-success/30', icon: ListChecks },
  delivery: { label_ar: 'تسليم', label_en: 'Delivery', color: 'border-success dark:border-success/30', icon: ListChecks },
};