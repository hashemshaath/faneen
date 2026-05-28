/**
 * BUSINESS-CORE-4 — Pure KPI aggregation over an already-fetched list of
 * work orders. No Supabase access, no side effects — safe to call inside
 * render with useMemo.
 */
import type {
  WorkOrderRow,
  WorkOrderStatus,
  WorkOrderPriority,
} from "../types";

export interface WorkOrderKpis {
  total: number;
  byStatus: Record<WorkOrderStatus, number>;
  byPriority: Record<WorkOrderPriority, number>;
  openCount: number;        // draft + active + on_hold
  completedCount: number;
  overdueCount: number;     // due_at < now AND not completed/cancelled
  dueThisWeekCount: number; // due_at within next 7 days, open
  unassignedCount: number;  // owner_user_id is null AND open
}

const OPEN_STATUSES: ReadonlyArray<WorkOrderStatus> = ["draft", "active", "on_hold"];

export function computeWorkOrderKpis(rows: ReadonlyArray<WorkOrderRow>): WorkOrderKpis {
  const now = Date.now();
  const weekMs = 7 * 24 * 60 * 60 * 1000;

  const byStatus: Record<WorkOrderStatus, number> = {
    draft: 0, active: 0, on_hold: 0, completed: 0, cancelled: 0,
  };
  const byPriority: Record<WorkOrderPriority, number> = {
    low: 0, medium: 0, high: 0, urgent: 0,
  };

  let overdueCount = 0;
  let dueThisWeekCount = 0;
  let unassignedCount = 0;

  for (const r of rows) {
    const status = r.status as WorkOrderStatus;
    const priority = (r.priority ?? "medium") as WorkOrderPriority;
    if (byStatus[status] !== undefined) byStatus[status]++;
    if (byPriority[priority] !== undefined) byPriority[priority]++;

    const isOpen = OPEN_STATUSES.includes(status);
    if (isOpen && !r.owner_user_id) unassignedCount++;

    if (r.due_at) {
      const due = new Date(r.due_at).getTime();
      if (!Number.isNaN(due)) {
        if (isOpen && due < now) overdueCount++;
        else if (isOpen && due - now <= weekMs && due - now >= 0) dueThisWeekCount++;
      }
    }
  }

  const openCount = byStatus.draft + byStatus.active + byStatus.on_hold;

  return {
    total: rows.length,
    byStatus,
    byPriority,
    openCount,
    completedCount: byStatus.completed,
    overdueCount,
    dueThisWeekCount,
    unassignedCount,
  };
}