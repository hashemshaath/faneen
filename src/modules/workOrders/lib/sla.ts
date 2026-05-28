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

/** Open task statuses — must match the processor's actionable set. */
const OPEN_TASK_STATUSES: ReadonlyArray<string> = ["todo", "in_progress", "blocked"];

/** Default "due soon" horizon: 72 hours. UI-only knob. */
export const SLA_DUE_SOON_MS = 72 * 60 * 60 * 1000;

/** Overdue escalation thresholds — must mirror process_work_order_sla_due_items. */
export const SLA_OVERDUE_1_MS = 1 * 24 * 60 * 60 * 1000; // 1 day
export const SLA_OVERDUE_2_MS = 3 * 24 * 60 * 60 * 1000; // 3 days
export const SLA_OVERDUE_3_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

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

/* ───────────────── BUSINESS-WORKFLOW-3 ─────────────────
 * SLA bucket + escalation helpers. Pure, side-effect-free.
 * Mirrors the rules enforced by `process_work_order_sla_due_items()`.
 * No automation, no notifications, no I/O.
 */

export type SlaBucket = "completed" | "overdue" | "due_soon" | "on_track" | "ignored";

export type SlaEscalationLevel =
  | "none"
  | "due_soon"
  | "overdue_1"
  | "overdue_2"
  | "overdue_3";

/** True if the row is in scope for SLA evaluation (open, undeleted, has due_at). */
export function isSlaActionable(
  row: { status?: string | null; due_at?: string | null; deleted_at?: string | null },
  options: { kind?: "work_order" | "task" } = {},
): boolean {
  if (row.deleted_at) return false;
  if (!row.due_at) return false;
  const status = (row.status ?? "") as string;
  const open = options.kind === "task" ? OPEN_TASK_STATUSES : OPEN_STATUSES;
  return (open as ReadonlyArray<string>).includes(status);
}

/**
 * Categorise a work order row for SLA dashboard bucketing.
 * - `completed`  → status === completed
 * - `ignored`    → deleted / cancelled / archived
 * - `overdue`    → actionable and past due
 * - `due_soon`   → actionable and within 72h of due
 * - `on_track`   → actionable with a future due_at beyond the soon window
 */
export function getWorkOrderSlaBucket(
  row: { status?: string | null; due_at?: string | null; deleted_at?: string | null; completed_at?: string | null },
  now: number = Date.now(),
): SlaBucket {
  if (row.deleted_at) return "ignored";
  const status = (row.status ?? "") as string;
  if (status === "completed" || row.completed_at) return "completed";
  if (status === "cancelled") return "ignored";
  if (!row.due_at) return "ignored";
  if (!isSlaActionable(row, { kind: "work_order" })) return "ignored";
  const due = new Date(row.due_at).getTime();
  if (Number.isNaN(due)) return "ignored";
  const delta = due - now;
  if (delta < 0) return "overdue";
  if (delta <= SLA_DUE_SOON_MS) return "due_soon";
  return "on_track";
}

/** Same as getWorkOrderSlaBucket but for task rows. */
export function getTaskSlaBucket(
  row: { status?: string | null; due_at?: string | null; deleted_at?: string | null; completed_at?: string | null },
  now: number = Date.now(),
): SlaBucket {
  if (row.deleted_at) return "ignored";
  const status = (row.status ?? "") as string;
  if (status === "completed" || row.completed_at) return "completed";
  if (status === "archived" || status === "cancelled") return "ignored";
  if (!row.due_at) return "ignored";
  if (!isSlaActionable(row, { kind: "task" })) return "ignored";
  const due = new Date(row.due_at).getTime();
  if (Number.isNaN(due)) return "ignored";
  const delta = due - now;
  if (delta < 0) return "overdue";
  if (delta <= SLA_DUE_SOON_MS) return "due_soon";
  return "on_track";
}

/**
 * Compute the SLA escalation level for a single row. Mirrors the SQL
 * `process_work_order_sla_due_items` exactly:
 * - `none`       → not actionable, or due_at > 72h away
 * - `due_soon`   → due within the next 72h (and not past due)
 * - `overdue_1`  → past due, but < 3 days late
 * - `overdue_2`  → 3–7 days late
 * - `overdue_3`  → ≥ 7 days late
 */
export function getSlaEscalationLevel(
  row: { status?: string | null; due_at?: string | null; deleted_at?: string | null },
  options: { kind?: "work_order" | "task"; now?: number } = {},
): SlaEscalationLevel {
  const now = options.now ?? Date.now();
  if (!isSlaActionable(row, { kind: options.kind ?? "work_order" })) return "none";
  const due = new Date(row.due_at as string).getTime();
  if (Number.isNaN(due)) return "none";
  const delta = due - now;
  if (delta > SLA_DUE_SOON_MS) return "none";
  if (delta >= 0) return "due_soon";
  const lateMs = -delta;
  if (lateMs >= SLA_OVERDUE_3_MS) return "overdue_3";
  if (lateMs >= SLA_OVERDUE_2_MS) return "overdue_2";
  return "overdue_1";
}

export interface WorkOrderSlaSummary {
  overdue: number;
  dueSoon: number;
  onTrack: number;
  completed: number;
}

export function summariseWorkOrderSla(
  rows: ReadonlyArray<{ status?: string | null; due_at?: string | null; deleted_at?: string | null; completed_at?: string | null }>,
  now: number = Date.now(),
): WorkOrderSlaSummary {
  const out: WorkOrderSlaSummary = { overdue: 0, dueSoon: 0, onTrack: 0, completed: 0 };
  for (const r of rows) {
    const b = getWorkOrderSlaBucket(r, now);
    if (b === "overdue") out.overdue++;
    else if (b === "due_soon") out.dueSoon++;
    else if (b === "on_track") out.onTrack++;
    else if (b === "completed") out.completed++;
  }
  return out;
}