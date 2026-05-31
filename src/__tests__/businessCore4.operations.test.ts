import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join } from "node:path";
import {
  computeWorkOrderKpis,
  WORK_ORDER_STATUS_LABELS,
  WORK_ORDER_PRIORITY_LABELS,
  WORK_ORDER_STAGE_STATUS_LABELS,
  WORK_ORDER_TASK_STATUS_LABELS,
  getWorkOrderSourceLabel,
} from "@/modules/workOrders";
import type { WorkOrderRow } from "@/modules/workOrders";

const ROOT = process.cwd();
const SRC = join(ROOT, "src");
const APP = join(SRC, "App.tsx");
const SIDEBAR = join(SRC, "components/dashboard/DashboardSidebar.tsx");
const PAGE = join(SRC, "pages/dashboard/DashboardWorkOrdersOverview.tsx");
const COMP_DIR = join(SRC, "components/workOrders");

function walk(dir: string, out: string[] = []): string[] {
  if (!existsSync(dir)) return out;
  for (const e of readdirSync(dir)) {
    const full = join(dir, e);
    const s = statSync(full);
    if (s.isDirectory()) walk(full, out);
    else if (/\.(ts|tsx)$/.test(e)) out.push(full);
  }
  return out;
}

function row(over: Partial<WorkOrderRow>): WorkOrderRow {
  return {
    id: "x", ref_id: "WO-1", business_id: "b", source_type: "manual", source_id: null,
    title: "t", customer_name: null, customer_phone: null, status: "active",
    current_stage_key: null, priority: "medium", owner_user_id: null,
    created_by_user_id: null, due_at: null, completed_at: null,
    created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    deleted_at: null, ...over,
  } as WorkOrderRow;
}

describe("BUSINESS-CORE-4: shared enum helpers", () => {
  it("provides bilingual labels for every status/priority/stage/task value", () => {
    for (const k of ["draft","active","on_hold","completed","cancelled"] as const) {
      expect(WORK_ORDER_STATUS_LABELS[k].ar).toBeTruthy();
      expect(WORK_ORDER_STATUS_LABELS[k].en).toBeTruthy();
    }
    for (const k of ["low","medium","high","urgent"] as const) {
      expect(WORK_ORDER_PRIORITY_LABELS[k].ar).toBeTruthy();
    }
    for (const k of ["pending","active","completed","skipped"] as const) {
      expect(WORK_ORDER_STAGE_STATUS_LABELS[k].en).toBeTruthy();
    }
    for (const k of ["todo","in_progress","blocked","completed","archived"] as const) {
      expect(WORK_ORDER_TASK_STATUS_LABELS[k].en).toBeTruthy();
    }
  });

  it("source label falls back to Manual / يدوي", () => {
    expect(getWorkOrderSourceLabel(null, false)).toBe("Manual");
    expect(getWorkOrderSourceLabel(null, true)).toBe("يدوي");
    expect(getWorkOrderSourceLabel("lead", false)).toBe("Lead");
  });
});

describe("BUSINESS-CORE-4: KPI compute", () => {
  it("aggregates counts, overdue, due-this-week, unassigned", () => {
    const past = new Date(Date.now() - 86_400_000).toISOString();
    const soon = new Date(Date.now() + 2 * 86_400_000).toISOString();
    const k = computeWorkOrderKpis([
      row({ status: "active",    due_at: past, owner_user_id: null }),
      row({ status: "active",    due_at: soon, owner_user_id: "u1" }),
      row({ status: "draft",     owner_user_id: null }),
      row({ status: "completed", due_at: past }),
      row({ status: "cancelled" }),
    ]);
    expect(k.total).toBe(5);
    expect(k.completedCount).toBe(1);
    expect(k.openCount).toBe(3);
    expect(k.overdueCount).toBe(1);
    expect(k.dueThisWeekCount).toBe(1);
    expect(k.unassignedCount).toBe(2);
  });

  it("empty input yields zeroed KPIs", () => {
    const k = computeWorkOrderKpis([]);
    expect(k.total).toBe(0);
    expect(k.openCount).toBe(0);
    expect(k.overdueCount).toBe(0);
  });
});

describe("BUSINESS-CORE-4: route + sidebar", () => {
  const app = readFileSync(APP, "utf8");
  const sidebar = readFileSync(SIDEBAR, "utf8");

  it("registers /dashboard/work-orders/overview route", () => {
    expect(app).toMatch(/\/dashboard\/work-orders\/overview/);
    expect(app).toMatch(/DashboardWorkOrdersOverview/);
  });

  // NAVIGATION-CONSOLIDATION-1 (group 5): the dedicated Operations
  // Overview sidebar entry was merged into the main "Work Orders"
  // link. The /dashboard/work-orders/overview path itself still
  // resolves (now via redirect) for legacy bookmarks.
  it("keeps Work Orders sidebar entry available", () => {
    expect(sidebar).toMatch(/\/dashboard\/work-orders["']/);
    expect(sidebar).toMatch(/Work Orders/);
  });

  it("does not modify /dashboard/operations route", () => {
    expect(app).toMatch(/path="\/dashboard\/operations"/);
  });
});

describe("BUSINESS-CORE-4: page hygiene", () => {
  const page = readFileSync(PAGE, "utf8");

  it("does not call supabase.from directly", () => {
    expect(page).not.toMatch(/supabase\.from\s*\(/);
  });

  it("imports only from work-orders module barrel for WO data", () => {
    expect(page).toMatch(/from\s+["']@\/modules\/workOrders["']/);
  });

  it("does not import payment/auth/cron/notification modules", () => {
    expect(page).not.toMatch(/payments?\//i);
    expect(page).not.toMatch(/\/auth\//i);
    expect(page).not.toMatch(/cron|scheduler/i);
    expect(page).not.toMatch(/notifications?\//i);
    expect(page).not.toMatch(/sendTransactionalEmail|email-queue/i);
    expect(page).not.toMatch(/realtime|channel\(/i);
  });

  it("uses ReferenceBadge — no raw UUID primary display", () => {
    expect(page).toMatch(/ReferenceBadge/);
    expect(page).not.toMatch(/>\s*\{[a-zA-Z_.]+\.id\}\s*</);
  });

  it("uses noindex + loading + no-entity states", () => {
    expect(page).toMatch(/useNoIndex/);
    expect(page).toMatch(/active_entity_id/);
    expect(page).toMatch(/Loading|loading|جارٍ/);
  });
});

describe("BUSINESS-CORE-4: UI primitives hygiene", () => {
  const files = walk(COMP_DIR);

  it("ships the expected primitives", () => {
    const names = files.map((f) => f.split("/").pop());
    for (const n of [
      "WorkOrderStatusBadge.tsx",
      "WorkOrderPriorityBadge.tsx",
      "WorkOrderSourceBadge.tsx",
      "WorkOrderAssigneeChip.tsx",
      "WorkOrderKpiCards.tsx",
      "WorkOrderActivityCard.tsx",
    ]) expect(names).toContain(n);
  });

  it("no primitive calls supabase.from or touches work_order_* tables", () => {
    for (const f of files) {
      const src = readFileSync(f, "utf8");
      expect(src).not.toMatch(/supabase\.from\s*\(/);
      expect(src).not.toMatch(/from\(["']work_order/);
    }
  });

  it("assignee chip masks unknown user as label, never raw id", () => {
    const src = readFileSync(join(COMP_DIR, "WorkOrderAssigneeChip.tsx"), "utf8");
    expect(src).toMatch(/Unassigned|غير مُسنَد/);
    expect(src).not.toMatch(/\{assigneeUserId\}/);
  });
});

describe("BUSINESS-CORE-4: isolation — overview does not bypass module", () => {
  const files = walk(join(SRC, "components/workOrders")).concat([PAGE]);
  it("no work_order_* table access outside modules/workOrders/", () => {
    for (const f of files) {
      const src = readFileSync(f, "utf8");
      expect(src).not.toMatch(/from\(["']work_orders?["']\)/);
      expect(src).not.toMatch(/from\(["']work_order_(stages|tasks|comments)["']\)/);
    }
  });
});