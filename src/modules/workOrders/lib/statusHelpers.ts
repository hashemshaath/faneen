/**
 * BUSINESS-CORE-4 — Shared bilingual labels + semantic token classes for
 * Work Order status / priority / stage / task enums.
 *
 * Pure presentation helpers — no Supabase access, no side effects. All UI
 * MUST consume these instead of hardcoding ar/en strings or color classes.
 */
import type {
  WorkOrderStatus,
  WorkOrderPriority,
  WorkOrderStageStatus,
  WorkOrderTaskStatus,
} from "../types";

export interface BiLabel {
  ar: string;
  en: string;
}

export const WORK_ORDER_STATUS_LABELS: Record<WorkOrderStatus, BiLabel> = {
  draft:     { ar: "مسودة",   en: "Draft" },
  active:    { ar: "نشط",     en: "Active" },
  on_hold:   { ar: "معلّق",   en: "On hold" },
  completed: { ar: "مكتمل",   en: "Completed" },
  cancelled: { ar: "ملغي",    en: "Cancelled" },
};

export const WORK_ORDER_PRIORITY_LABELS: Record<WorkOrderPriority, BiLabel> = {
  low:    { ar: "منخفضة", en: "Low" },
  medium: { ar: "متوسطة", en: "Medium" },
  high:   { ar: "عالية",  en: "High" },
  urgent: { ar: "عاجلة",  en: "Urgent" },
};

export const WORK_ORDER_STAGE_STATUS_LABELS: Record<WorkOrderStageStatus, BiLabel> = {
  pending:   { ar: "بانتظار",  en: "Pending" },
  active:    { ar: "قيد التنفيذ", en: "In progress" },
  completed: { ar: "مكتملة",   en: "Completed" },
  skipped:   { ar: "متخطّاة",  en: "Skipped" },
};

export const WORK_ORDER_TASK_STATUS_LABELS: Record<WorkOrderTaskStatus, BiLabel> = {
  todo:        { ar: "للتنفيذ",   en: "To do" },
  in_progress: { ar: "قيد التنفيذ", en: "In progress" },
  blocked:     { ar: "متوقفة",    en: "Blocked" },
  completed:   { ar: "مكتملة",    en: "Completed" },
  archived:    { ar: "مؤرشفة",    en: "Archived" },
};

/**
 * Semantic token classes. All colors map to design-system tokens — never
 * raw tailwind colors. Background uses /10 tint and matching foreground.
 */
export const WORK_ORDER_STATUS_TONE: Record<WorkOrderStatus, string> = {
  draft:     "bg-muted text-muted-foreground border-border/60",
  active:    "bg-info/10 text-info border-info/30",
  on_hold:   "bg-warning/10 text-warning border-warning/30",
  completed: "bg-success/10 text-success border-success/30",
  cancelled: "bg-destructive/10 text-destructive border-destructive/30",
};

export const WORK_ORDER_PRIORITY_TONE: Record<WorkOrderPriority, string> = {
  low:    "bg-muted text-muted-foreground border-border/60",
  medium: "bg-info/10 text-info border-info/30",
  high:   "bg-warning/10 text-warning border-warning/30",
  urgent: "bg-destructive/10 text-destructive border-destructive/30",
};

export const WORK_ORDER_STAGE_TONE: Record<WorkOrderStageStatus, string> = {
  pending:   "bg-muted text-muted-foreground border-border/60",
  active:    "bg-info/10 text-info border-info/30",
  completed: "bg-success/10 text-success border-success/30",
  skipped:   "bg-muted/60 text-muted-foreground border-border/40",
};

export const WORK_ORDER_TASK_TONE: Record<WorkOrderTaskStatus, string> = {
  todo:        "bg-muted text-muted-foreground border-border/60",
  in_progress: "bg-info/10 text-info border-info/30",
  blocked:     "bg-destructive/10 text-destructive border-destructive/30",
  completed:   "bg-success/10 text-success border-success/30",
  archived:    "bg-muted/60 text-muted-foreground border-border/40",
};

export function pickBi(label: BiLabel | undefined, isRTL: boolean): string {
  if (!label) return "";
  return isRTL ? label.ar : label.en;
}

export const WORK_ORDER_STATUS_VALUES: WorkOrderStatus[] = [
  "draft", "active", "on_hold", "completed", "cancelled",
];
export const WORK_ORDER_PRIORITY_VALUES: WorkOrderPriority[] = [
  "low", "medium", "high", "urgent",
];
export const WORK_ORDER_STAGE_STATUS_VALUES: WorkOrderStageStatus[] = [
  "pending", "active", "completed", "skipped",
];
export const WORK_ORDER_TASK_STATUS_VALUES: WorkOrderTaskStatus[] = [
  "todo", "in_progress", "blocked", "completed", "archived",
];