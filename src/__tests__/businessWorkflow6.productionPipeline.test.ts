/**
 * BUSINESS-WORKFLOW-6 — Production & Fabrication Pipeline.
 *
 * Source-level invariants for the migration, services, UI section, and
 * security boundaries (no payment/invoice/notification/realtime/external).
 */
import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const MIGRATIONS = join(ROOT, "supabase/migrations");
const read = (rel: string) => readFileSync(join(ROOT, rel), "utf8");

function findMigration(needle: string): string | null {
  if (!existsSync(MIGRATIONS)) return null;
  for (const f of readdirSync(MIGRATIONS).filter((x) => x.endsWith(".sql"))) {
    const src = readFileSync(join(MIGRATIONS, f), "utf8");
    if (src.includes(needle)) return src;
  }
  return null;
}

describe("BUSINESS-WORKFLOW-6 migration", () => {
  const sql = findMigration("transition_work_order_pipeline_stage");

  it("adds pipeline_stage column with canonical stage check", () => {
    expect(sql).not.toBeNull();
    expect(sql!).toMatch(/ADD COLUMN IF NOT EXISTS pipeline_stage/);
    expect(sql!).toMatch(/work_orders_pipeline_stage_chk/);
    for (const s of [
      "draft","measured","quoted","approved","engineering",
      "procurement","fabrication","qc","ready","installation",
      "completed","cancelled",
    ]) {
      expect(sql!).toContain(`'${s}'`);
    }
  });

  it("creates 4 new tables with RLS + grants (no anon access)", () => {
    for (const t of [
      "work_order_pipeline_events",
      "work_order_stage_assignments",
      "work_order_checklists",
      "work_order_checklist_items",
    ]) {
      expect(sql!).toMatch(new RegExp(`CREATE TABLE public\\.${t}`));
      expect(sql!).toMatch(new RegExp(`ALTER TABLE public\\.${t} ENABLE ROW LEVEL SECURITY`));
      expect(sql!).toMatch(new RegExp(`GRANT [^;]+ ON public\\.${t} TO authenticated`));
      expect(sql!).not.toMatch(new RegExp(`GRANT [^;]+ ON public\\.${t} TO anon`));
    }
  });

  it("enforces forward-only progression and locking in the RPC", () => {
    expect(sql!).toMatch(/work_order_locked/);
    expect(sql!).toMatch(/forward_only/);
    expect(sql!).toMatch(/cannot_skip_to_completed/);
    expect(sql!).toMatch(/is_business_owner_or_manager/);
    expect(sql!).toMatch(/work_order\.stage_changed/);
    expect(sql!).toMatch(/GRANT EXECUTE ON FUNCTION public\.transition_work_order_pipeline_stage\(uuid, text, text\) TO authenticated/);
    expect(sql!).toMatch(/REVOKE ALL ON FUNCTION public\.transition_work_order_pipeline_stage\(uuid, text, text\) FROM anon/);
  });

  it("locks completed/cancelled checklists in trigger", () => {
    expect(sql!).toMatch(/checklist_locked/);
  });

  it("does NOT touch payments/invoices/notifications/realtime", () => {
    expect(sql!).not.toMatch(/contract_payments/i);
    expect(sql!).not.toMatch(/INSERT INTO public\.invoices/i);
    expect(sql!).not.toMatch(/INSERT INTO public\.notifications\b/i);
    expect(sql!).not.toMatch(/pg_notify\s*\(/i);
    expect(sql!).not.toMatch(/ADD TABLE.*supabase_realtime/i);
  });
});

describe("Pipeline services", () => {
  it("transitionWorkOrderStage uses the RPC, never raw work_orders writes", () => {
    const src = read("src/modules/workOrders/services/transitionWorkOrderStage.ts");
    expect(src).toMatch(/supabase\.rpc\(\s*"transition_work_order_pipeline_stage"/);
    expect(src).not.toMatch(/\.from\(\s*["']work_orders["']\s*\)/);
  });

  it("createWorkOrderChecklist seeds from sector presets and audits", () => {
    const src = read("src/modules/workOrders/services/createWorkOrderChecklist.ts");
    expect(src).toMatch(/WORK_ORDER_CHECKLIST_PRESETS/);
    expect(src).toMatch(/work_order\.checklist_created/);
  });

  it("completeChecklistItem + completeChecklist write audit events", () => {
    const src = read("src/modules/workOrders/services/updateChecklistItem.ts");
    expect(src).toMatch(/work_order\.checklist_item_updated/);
    expect(src).toMatch(/work_order\.checklist_completed/);
  });

  it("assignWorkOrderStageUser writes operator_assigned audit", () => {
    const src = read("src/modules/workOrders/services/assignWorkOrderStageUser.ts");
    expect(src).toMatch(/work_order\.operator_assigned/);
  });

  it("recordWorkOrderAudit declares all new pipeline actions", () => {
    const src = read("src/modules/workOrders/services/recordWorkOrderAudit.ts");
    for (const a of [
      "work_order.stage_changed",
      "work_order.checklist_created",
      "work_order.checklist_completed",
      "work_order.checklist_item_updated",
      "work_order.operator_assigned",
    ]) {
      expect(src).toContain(a);
    }
  });
});

describe("Fabrication sector presets", () => {
  const src = read("src/modules/workOrders/types.ts");

  it("defines presets for kitchen / aluminum / glass / steel / wood / generic", () => {
    for (const k of ["kitchen","aluminum","glass","steel","wood","generic"]) {
      expect(src).toMatch(new RegExp(`${k}:\\s*{`));
    }
  });

  it("includes signature kitchen items", () => {
    expect(src).toMatch(/Measurements confirmed/);
    expect(src).toMatch(/Cutting list approved/);
    expect(src).toMatch(/Countertop ready/);
    expect(src).toMatch(/Installation scheduled/);
  });

  it("includes signature aluminum / glass / steel / wood items", () => {
    expect(src).toMatch(/Profile cutting/);
    expect(src).toMatch(/Glass inserted/);
    expect(src).toMatch(/Accessories installed/);
    expect(src).toMatch(/Tempering completed/);
    expect(src).toMatch(/Edge polish completed/);
    expect(src).toMatch(/Welding completed/);
    expect(src).toMatch(/Coating completed/);
    expect(src).toMatch(/CNC completed/);
    expect(src).toMatch(/Edge banding completed/);
  });
});

describe("WorkOrderPipelineSection UI", () => {
  const src = read("src/components/workOrders/WorkOrderPipelineSection.tsx");

  it("has no popups/dialogs (inline only)", () => {
    expect(src).not.toMatch(/from\s+["']@\/components\/ui\/dialog["']/);
    expect(src).not.toMatch(/AlertDialog/);
    expect(src).not.toMatch(/<Dialog\b/);
  });

  it("has no drag-drop / kanban (deferred)", () => {
    expect(src).not.toMatch(/@dnd-kit/);
    expect(src).not.toMatch(/react-beautiful-dnd/);
    expect(src).not.toMatch(/kanban/i);
  });

  it("uses module barrel imports, never raw supabase.from", () => {
    expect(src).not.toMatch(/supabase\.from/);
    expect(src).toMatch(/from\s+["']@\/modules\/workOrders["']/);
  });

  it("renders timeline, progress, QC ready, installation ready", () => {
    expect(src).toMatch(/Production Pipeline/);
    expect(src).toMatch(/qcReady/);
    expect(src).toMatch(/installReady/);
    expect(src).toMatch(/overallProgress/);
  });

  it("respects forward-only and locked states for transition buttons", () => {
    expect(src).toMatch(/nextStages/);
    expect(src).toMatch(/STAGE_ORDER\[s\] > order/);
    expect(src).toMatch(/stage === "installation"/);
    expect(src).toMatch(/locked/);
  });
});

describe("Detail page wiring", () => {
  const src = read("src/pages/dashboard/DashboardWorkOrderDetail.tsx");

  it("mounts WorkOrderPipelineSection", () => {
    expect(src).toMatch(/WorkOrderPipelineSection/);
    expect(src).toMatch(/currentStage=/);
    expect(src).toMatch(/canManage=/);
  });

  it("does not call supabase.from directly", () => {
    expect(src).not.toMatch(/supabase\.from\(/);
  });
});

describe("Module barrel exposes pipeline surface", () => {
  const src = read("src/modules/workOrders/index.ts");

  it("exports new pipeline services", () => {
    expect(src).toMatch(/transitionWorkOrderStage/);
    expect(src).toMatch(/assignWorkOrderStageUser/);
    expect(src).toMatch(/listWorkOrderPipelineEvents/);
    expect(src).toMatch(/createWorkOrderChecklist/);
    expect(src).toMatch(/updateChecklistItem/);
    expect(src).toMatch(/completeChecklistItem/);
    expect(src).toMatch(/completeChecklist\b/);
    expect(src).toMatch(/listWorkOrderChecklists/);
    expect(src).toMatch(/listChecklistItems/);
    expect(src).toMatch(/WORK_ORDER_PIPELINE_STAGES/);
  });
});

describe("Security & scope boundaries", () => {
  const files = [
    "src/modules/workOrders/services/transitionWorkOrderStage.ts",
    "src/modules/workOrders/services/assignWorkOrderStageUser.ts",
    "src/modules/workOrders/services/createWorkOrderChecklist.ts",
    "src/modules/workOrders/services/updateChecklistItem.ts",
    "src/modules/workOrders/services/listWorkOrderChecklists.ts",
    "src/modules/workOrders/services/listWorkOrderPipelineEvents.ts",
    "src/components/workOrders/WorkOrderPipelineSection.tsx",
  ];

  it("no realtime / channels / external notifications / payments", () => {
    for (const f of files) {
      const src = read(f);
      expect(src, f).not.toMatch(/supabase\.channel\(/);
      expect(src, f).not.toMatch(/postgres_changes/);
      expect(src, f).not.toMatch(/from\s+["']@\/modules\/payments["']/);
      expect(src, f).not.toMatch(/from\s+["']@\/modules\/auth["']/);
      expect(src, f).not.toMatch(/from\s+["']@\/modules\/notifications["']/);
      expect(src, f).not.toMatch(/from\s+["']@\/modules\/contracts["']/);
    }
  });
});