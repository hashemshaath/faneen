/**
 * BUSINESS-WORKFLOW-PRODUCTION-2 — Production Board Kanban + WIP limits +
 * capacity metrics.
 *
 * Pure static-source + helper-behavior guards. No DOM rendering. Mirrors
 * the format of `businessWorkflow7.productionBoard.test.tsx` and
 * `appStabilityContractsProcurementHardening.test.ts`.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  WIP_LIMITS,
  getWipStatus,
  computeBoardCapacity,
  classifyTransitionError,
  mapTransitionError,
  BOARD_COLUMN_STAGES,
} from "@/modules/workOrders";

const ROOT = process.cwd();
const read = (rel: string) => readFileSync(join(ROOT, rel), "utf8");

const PAGE = "src/pages/dashboard/ProductionBoardPage.tsx";
const PAGE_SRC = read(PAGE);
const APP_SRC = read("src/App.tsx");

describe("PRODUCTION-2 · route + page wiring", () => {
  it("board route still registered", () => {
    expect(APP_SRC).toMatch(/path="\/dashboard\/work-orders\/board"/);
  });

  it("board page imports listWorkOrdersForBoard wrapper, no raw supabase.from", () => {
    expect(PAGE_SRC).toMatch(/listWorkOrdersForBoard\(/);
    expect(PAGE_SRC).not.toMatch(/supabase\.from\(/);
    expect(PAGE_SRC).not.toMatch(/from\s+["']@\/integrations\/supabase\/client["']/);
  });

  it("renders columns for every canonical pipeline stage", () => {
    expect(PAGE_SRC).toMatch(/BOARD_COLUMN_STAGES/);
    for (const s of BOARD_COLUMN_STAGES) {
      // every stage flows through the column map at runtime; ensure pipeline
      // rules + stage label key are reachable from the barrel.
      expect(typeof s).toBe("string");
    }
  });
});

describe("PRODUCTION-2 · forbidden surfaces", () => {
  it("no realtime / channel / postgres_changes / .subscribe(", () => {
    expect(PAGE_SRC).not.toMatch(/supabase\.channel\(/);
    expect(PAGE_SRC).not.toMatch(/postgres_changes/);
    expect(PAGE_SRC).not.toMatch(/\.subscribe\(/);
  });

  it("no drag-and-drop dependency or import", () => {
    expect(PAGE_SRC).not.toMatch(/@dnd-kit/);
    expect(PAGE_SRC).not.toMatch(/react-beautiful-dnd/);
    expect(PAGE_SRC).not.toMatch(/\breact-dnd\b/);
    expect(PAGE_SRC).not.toMatch(/\bonDragStart\b/);
    expect(PAGE_SRC).not.toMatch(/\bonDragOver\b/);
    expect(PAGE_SRC).not.toMatch(/\bdraggable=/);
  });

  it("no modal / dialog / popover imports on the page", () => {
    expect(PAGE_SRC).not.toMatch(/from\s+["']@\/components\/ui\/dialog["']/);
    expect(PAGE_SRC).not.toMatch(/from\s+["']@\/components\/ui\/alert-dialog["']/);
    expect(PAGE_SRC).not.toMatch(/from\s+["']@\/components\/ui\/popover["']/);
  });

  it("no inventory / supplier-payments / supplier-portal touched", () => {
    expect(PAGE_SRC).not.toMatch(/@\/modules\/inventory/);
    expect(PAGE_SRC).not.toMatch(/supplier_payments/);
    expect(PAGE_SRC).not.toMatch(/supplier[-_ ]?portal/i);
    expect(PAGE_SRC).not.toMatch(/inventory_/);
    expect(PAGE_SRC).not.toMatch(/stock_/);
    expect(PAGE_SRC).not.toMatch(/warehouse_/);
  });

  it("no payment / auth / membership module imports", () => {
    for (const mod of [
      "@/modules/payments",
      "@/modules/memberships",
      "@/modules/billing",
      "@/modules/notifications",
      "@/modules/contracts",
    ]) {
      expect(PAGE_SRC).not.toContain(`from "${mod}"`);
    }
  });

  it("no external notification senders", () => {
    expect(PAGE_SRC).not.toMatch(/sendEmail|sendSms|sendWhatsapp|enqueueNotification/);
  });
});

describe("PRODUCTION-2 · responsive + density", () => {
  it("ships sm: and lg: responsive classes", () => {
    expect(PAGE_SRC).toMatch(/\bsm:/);
    expect(PAGE_SRC).toMatch(/\blg:/);
  });

  it("exposes density toggle (comfortable + compact)", () => {
    expect(PAGE_SRC).toMatch(/data-testid="density-comfortable"/);
    expect(PAGE_SRC).toMatch(/data-testid="density-compact"/);
  });

  it("exposes mobile stacked-mode toggle", () => {
    expect(PAGE_SRC).toMatch(/data-testid="layout-stacked"/);
    expect(PAGE_SRC).toMatch(/data-testid="layout-kanban"/);
  });
});

describe("PRODUCTION-2 · stage move + assignment wrappers", () => {
  it("move actions go through transitionWorkOrderStage wrapper", () => {
    expect(PAGE_SRC).toMatch(/transitionWorkOrderStage\(/);
    expect(PAGE_SRC).toMatch(/getAllowedNextStages/);
    // never mutate pipeline_stage directly.
    expect(PAGE_SRC).not.toMatch(/pipeline_stage\s*:/);
    expect(PAGE_SRC).not.toMatch(/work_orders["'`]/);
  });

  it("assignment / unassignment go through wrappers, never raw inserts", () => {
    expect(PAGE_SRC).toMatch(/assignWorkOrderStageUser\(/);
    expect(PAGE_SRC).toMatch(/unassignWorkOrderStage\(/);
    expect(PAGE_SRC).not.toMatch(/work_order_stage_assignments/);
  });

  it("safe transition error mapping is wired in", () => {
    expect(PAGE_SRC).toMatch(/mapTransitionError\(/);
  });
});

describe("PRODUCTION-2 · WIP limit constants + helpers", () => {
  it("exposes the agreed advisory limits", () => {
    expect(WIP_LIMITS).toMatchObject({
      engineering: 10,
      procurement: 10,
      fabrication: 15,
      qc: 8,
      ready: 20,
      installation: 12,
    });
  });

  it("getWipStatus returns ok / warning / danger / none", () => {
    expect(getWipStatus("engineering", 1).status).toBe("ok");
    expect(getWipStatus("engineering", 8).status).toBe("warning"); // 8/10 = 80%
    expect(getWipStatus("engineering", 10).status).toBe("warning");
    expect(getWipStatus("engineering", 11).status).toBe("danger");
    expect(getWipStatus("measured", 99).status).toBe("none"); // no configured limit
  });

  it("page surfaces overloaded warning + danger labels per column", () => {
    expect(PAGE_SRC).toMatch(/data-testid={`wip-badge-/);
    expect(PAGE_SRC).toMatch(/wip-warning-/);
    expect(PAGE_SRC).toMatch(/wip-danger-/);
  });
});

describe("PRODUCTION-2 · pure capacity metrics", () => {
  it("computes per-stage counts and detects overload + bottleneck", () => {
    // 11 engineering rows → over limit (10).
    const rows: Array<{
      id: string;
      pipeline_stage:
        | "engineering"
        | "fabrication";
      status: string;
      due_at: string | null;
    }> = Array.from({ length: 11 }, (_, i) => ({
      id: `wo-${i}`,
      pipeline_stage: "engineering",
      status: "active",
      due_at: null,
    }));
    rows.push({
      id: "wo-x",
      pipeline_stage: "fabrication",
      status: "active",
      due_at: null,
    });
    const m = computeBoardCapacity(rows, []);
    expect(m.stageCounts.engineering).toBe(11);
    expect(m.stageCounts.fabrication).toBe(1);
    expect(m.overloadedStages).toContain("engineering");
    expect(m.bottleneck).toBe("engineering");
    expect(m.unassignedCount).toBe(12);
  });

  it("counts overdue per stage and assigns operator workload", () => {
    const past = new Date(Date.now() - 86400_000).toISOString();
    const rows = [
      { id: "a", pipeline_stage: "qc" as const, status: "active", due_at: past },
      { id: "b", pipeline_stage: "qc" as const, status: "active", due_at: null },
    ];
    const m = computeBoardCapacity(rows, [
      { work_order_id: "a", stage_key: "qc", assigned_to_user_id: "u1" },
    ]);
    expect(m.overdueByStage.qc).toBe(1);
    expect(m.operatorWorkload.u1).toBe(1);
    expect(m.unassignedCount).toBe(1);
  });

  it("ignores completed/cancelled rows", () => {
    const m = computeBoardCapacity(
      [
        { id: "a", pipeline_stage: "completed", status: "completed", due_at: null },
        { id: "b", pipeline_stage: "fabrication", status: "cancelled", due_at: null },
      ],
      [],
    );
    expect(m.stageCounts.completed).toBe(0);
    expect(m.stageCounts.fabrication).toBe(0);
    expect(m.unassignedCount).toBe(0);
  });
});

describe("PRODUCTION-2 · safe error mapping", () => {
  it("classifies known PostgREST codes", () => {
    expect(classifyTransitionError({ message: "forward_only violation" })).toBe("forward_only");
    expect(classifyTransitionError({ message: "work_order_locked" })).toBe("work_order_locked");
    expect(classifyTransitionError({ message: "cannot_skip_to_completed" })).toBe("cannot_skip_to_completed");
    expect(classifyTransitionError({ message: "not_authorized" })).toBe("not_authorized");
    expect(classifyTransitionError({ message: "weird random error" })).toBe("unknown");
    expect(classifyTransitionError(null)).toBe("unknown");
  });

  it("returns bilingual user-safe text", () => {
    expect(mapTransitionError({ message: "forward_only" }, "en")).toMatch(/forward/i);
    expect(mapTransitionError({ message: "forward_only" }, "ar")).toMatch(/المراحل|للأمام/);
    expect(mapTransitionError({ message: "anything" }, "en")).toMatch(/Failed/i);
  });
});