/**
 * BUSINESS-WORKFLOW-2 — Display-only SLA helpers for work orders & tasks.
 *
 * Pure functions. NO automation, NO cron, NO notifications, NO escalation —
 * these helpers exist only to compute UI badges (overdue / due-soon /
 * completed) from already-fetched rows.
 */
import type { WorkOrderRow, WorkOrderStatus } from "../types";

export type SlaState = "completed" | "overdue" | "due_soon" | "on_track" | "none";

/** Open lifecycle statuses (matches kpis.ts). */
const OPEN_STATUSES: ReadonlyArray<WorkOrderStatus> = ["draft", "active", "on_hold"];

/** Default "due soon" horizon: 72 hours. UI-only knob. */
export const SLA_DUE_SOON_MS = 72 * 60 * 60 * 1000;

export interface SlaInput {
  status: string | null | undefined;
  due_at: string | null | undefined;
  completed_at?: string | null | undefined;
}

/**
 * Classify a work order / task row's SLA state.
 *
 * - `completed`  → status === completed (or completed_at set)
 * - `overdue`    → open and due_at in the past
 * - `due_soon`   → open and due_at within SLA_DUE_SOON_MS
 * - `on_track`   → open with a future due_at beyond the soon window
 * - `none`       → no due_at and not completed
 */
export function computeSlaState(row: SlaInput, now: number = Date.now()): SlaState {
  const status = (row.status ?? "") as WorkOrderStatus;
  if (status === "completed" || row.completed_at) return "completed";
  if (status === "cancelled") return "none";
  if (!row.due_at) return "none";
  const due = new Date(row.due_at).getTime();
  if (Number.isNaN(due)) return "none";
  const isOpen = OPEN_STATUSES.includes(status);
  if (!isOpen) return "none";
  const delta = due - now;
  if (delta < 0) return "overdue";
  if (delta <= SLA_DUE_SOON_MS) return "due_soon";
  return "on_track";
}

export interface SlaLabel {
  ar: string;
  en: string;
}

export const SLA_LABELS: Record<SlaState, SlaLabel> = {
  completed: { ar: "مكتمل", en: "Completed" },
  overdue:   { ar: "متأخر", en: "Overdue" },
  due_soon:  { ar: "قريب الاستحقاق", en: "Due soon" },
  on_track:  { ar: "في الموعد", en: "On track" },
  none:      { ar: "—", en: "—" },
};

export function getSlaLabel(state: SlaState, isRTL: boolean): string {
  return isRTL ? SLA_LABELS[state].ar : SLA_LABELS[state].en;
}

/**
 * Returns true if the row matches a UI "overdue" filter.
 * Helper kept here so the page filter stays in sync with badge logic.
 */
export function isOverdueRow(row: WorkOrderRow, now: number = Date.now()): boolean {
  return computeSlaState(row, now) === "overdue";
}