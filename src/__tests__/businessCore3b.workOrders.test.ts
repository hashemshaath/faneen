import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const SRC = join(ROOT, "src");
const MIGRATION = join(
  ROOT,
  "supabase/migrations/20260527214937_930a8d23-b336-4a4a-a79e-e06d44db4b0f.sql",
);
const APP = join(SRC, "App.tsx");
const SIDEBAR = join(SRC, "components/dashboard/DashboardSidebar.tsx");
const PAGE = join(SRC, "pages/dashboard/DashboardWorkOrders.tsx");
const MODULE_BARREL = join(SRC, "modules/workOrders/index.ts");
const MODULE_DIR = join(SRC, "modules/workOrders/services");

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

describe("BUSINESS-CORE-3B: route + sidebar", () => {
  const app = readFileSync(APP, "utf8");
  const sidebar = readFileSync(SIDEBAR, "utf8");

  it("registers /dashboard/work-orders route", () => {
    expect(app).toMatch(/path="\/dashboard\/work-orders"/);
    expect(app).toMatch(/DashboardWorkOrders/);
  });

  it("adds sidebar entry for Work Orders / أوامر العمل", () => {
    expect(sidebar).toMatch(/\/dashboard\/work-orders/);
    expect(sidebar).toMatch(/أوامر العمل/);
    expect(sidebar).toMatch(/Work Orders/);
  });
});

describe("BUSINESS-CORE-3B: page hygiene", () => {
  const page = readFileSync(PAGE, "utf8");

  it("does not call supabase.from directly", () => {
    expect(page).not.toMatch(/supabase\.from\s*\(/);
  });

  it("imports only from work-orders module barrel", () => {
    expect(page).toMatch(/from\s+["']@\/modules\/workOrders["']/);
  });

  it("does not import notification / email / cron modules", () => {
    expect(page).not.toMatch(/notifications?\//i);
    expect(page).not.toMatch(/sendTransactionalEmail|email-queue/i);
    expect(page).not.toMatch(/cron|scheduler/i);
  });

  it("uses ReferenceBadge for WO/TASK refs (no raw UUID primary display)", () => {
    expect(page).toMatch(/ReferenceBadge/);
    // No accidental raw UUID rendering like {wo.id} as a label.
    expect(page).not.toMatch(/>\s*\{[a-zA-Z_.]+\.id\}\s*</);
  });

  it("renders loading / empty / no-entity states", () => {
    expect(page).toMatch(/Loading|loading|جارٍ/);
    expect(page).toMatch(/empty|No work orders|لا توجد/);
    expect(page).toMatch(/active_entity_id/);
  });
});

describe("BUSINESS-CORE-3B: services + barrel", () => {
  const barrel = readFileSync(MODULE_BARREL, "utf8");
  const expected = [
    "listWorkOrdersForBusiness",
    "getWorkOrderById",
    "createWorkOrder",
    "updateWorkOrder",
    "listWorkOrderStages",
    "updateWorkOrderStage",
    "listWorkOrderTasks",
    "createWorkOrderTask",
    "updateWorkOrderTask",
    "listWorkOrderComments",
    "addWorkOrderComment",
    "softDeleteWorkOrderTask",
    "softDeleteWorkOrder",
    "recordWorkOrderAudit",
  ];
  for (const name of expected) {
    it(`barrel exports ${name}`, () => {
      expect(barrel).toMatch(new RegExp(`\\b${name}\\b`));
    });
  }

  it("services touch the correct tables only", () => {
    const expectedTables: Record<string, string> = {
      "listWorkOrderStages.ts": "work_order_stages",
      "updateWorkOrderStage.ts": "work_order_stages",
      "listWorkOrderTasks.ts": "work_order_tasks",
      "createWorkOrderTask.ts": "work_order_tasks",
      "updateWorkOrderTask.ts": "work_order_tasks",
      "softDeleteWorkOrderTask.ts": "work_order_tasks",
      "listWorkOrderComments.ts": "work_order_comments",
      "addWorkOrderComment.ts": "work_order_comments",
      "softDeleteWorkOrder.ts": "work_orders",
    };
    for (const [file, table] of Object.entries(expectedTables)) {
      const src = readFileSync(join(MODULE_DIR, file), "utf8");
      expect(src).toMatch(new RegExp(`from\\(["']${table}["']\\)`));
    }
  });

  it("emits canonical audit events on mutating wrappers", () => {
    const taskCreate = readFileSync(join(MODULE_DIR, "createWorkOrderTask.ts"), "utf8");
    const taskUpdate = readFileSync(join(MODULE_DIR, "updateWorkOrderTask.ts"), "utf8");
    const stage = readFileSync(join(MODULE_DIR, "updateWorkOrderStage.ts"), "utf8");
    const comment = readFileSync(join(MODULE_DIR, "addWorkOrderComment.ts"), "utf8");
    expect(taskCreate).toMatch(/work_order\.task_created/);
    expect(taskUpdate).toMatch(/work_order\.task_completed/);
    expect(stage).toMatch(/work_order\.stage_updated/);
    expect(comment).toMatch(/work_order\.comment_added/);
  });

  it("audit helper swallows errors (never throws)", () => {
    const src = readFileSync(join(MODULE_DIR, "recordWorkOrderAudit.ts"), "utf8");
    expect(src).toMatch(/try\s*{/);
    expect(src).toMatch(/catch\s*{/);
  });
});

describe("BUSINESS-CORE-3B: isolation — no other code touches work_order_* tables", () => {
  const files = walk(SRC);
  const allowedPrefix = join(SRC, "modules/workOrders/");
  const tables = ["work_orders", "work_order_stages", "work_order_tasks", "work_order_comments"];

  for (const table of tables) {
    it(`only modules/workOrders may .from('${table}')`, () => {
      const offenders = files.filter((f) => {
        if (f.startsWith(allowedPrefix)) return false;
        if (f.includes("__tests__") || f.endsWith(".test.ts")) return false;
        const txt = readFileSync(f, "utf8");
        return new RegExp(`from\\(["']${table}["']\\)`).test(txt);
      });
      expect(offenders).toEqual([]);
    });
  }
});

describe("BUSINESS-CORE-3B: migration / RLS contract", () => {
  const sql = readFileSync(MIGRATION, "utf8");

  it("creates all four tables", () => {
    expect(sql).toMatch(/CREATE TABLE public\.work_orders/);
    expect(sql).toMatch(/CREATE TABLE public\.work_order_stages/);
    expect(sql).toMatch(/CREATE TABLE public\.work_order_tasks/);
    expect(sql).toMatch(/CREATE TABLE public\.work_order_comments/);
  });

  it("enables RLS on all four tables", () => {
    const matches = sql.match(/ENABLE ROW LEVEL SECURITY/g) ?? [];
    expect(matches.length).toBeGreaterThanOrEqual(4);
  });

  it("has no anon policies and no anon grants on work_order tables", () => {
    expect(sql).not.toMatch(/TO\s+anon/i);
    expect(sql).not.toMatch(/GRANT[^;]*work_order[^;]*TO\s+anon/i);
  });

  it("declares member SELECT + manager write + assignee self-update + comment author policies", () => {
    expect(sql).toMatch(/wo_select_member/);
    expect(sql).toMatch(/wo_(insert|update)_manager/);
    expect(sql).toMatch(/wot_update_assignee/);
    expect(sql).toMatch(/woc_(insert|update)_(member|author)/);
  });

  it("defines is_work_order_member helper with search_path = public", () => {
    expect(sql).toMatch(/CREATE\s+OR\s+REPLACE\s+FUNCTION\s+public\.is_work_order_member/);
    expect(sql).toMatch(/SET\s+search_path\s*=\s*public/);
  });

  it("emits WO- and TASK- reference id prefixes from triggers", () => {
    expect(sql).toMatch(/'WO-'/);
    expect(sql).toMatch(/'TASK-'/);
  });
});