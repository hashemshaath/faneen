/**
 * BUSINESS-WORKFLOW-7 — Production Operations Board.
 *
 * Source-level invariants for the route, page, services, and security
 * boundaries (no realtime / drag-drop / popovers / payments / external
 * notifications). No DOM rendering — all assertions are read against the
 * source files so they are deterministic and fast.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const read = (rel: string) => readFileSync(join(ROOT, rel), "utf8");

const PAGE = "src/pages/dashboard/ProductionBoardPage.tsx";
const PAGE_SRC = read(PAGE);
const APP_SRC = read("src/App.tsx");
const RULES_SRC = read("src/modules/workOrders/lib/pipelineRules.ts");
const SERVICE_SRC = read("src/modules/workOrders/services/listWorkOrdersForBoard.ts");
const BARREL_SRC = read("src/modules/workOrders/index.ts");
const WO_PAGE_SRC = read("src/pages/dashboard/DashboardWorkOrders.tsx");

describe("BUSINESS-WORKFLOW-7 route wiring", () => {
  it("registers /dashboard/work-orders/board route in App.tsx", () => {
    expect(APP_SRC).toMatch(/path="\/dashboard\/work-orders\/board"/);
    expect(APP_SRC).toMatch(/<ProductionBoardPage \/>/);
  });

  it("uses lazyRetry import pattern under ProtectedRoute", () => {
    expect(APP_SRC).toMatch(
      /ProductionBoardPage\s*=\s*lazyRetry\(\(\)\s*=>\s*import\("\.\/pages\/dashboard\/ProductionBoardPage"\)\)/,
    );
    expect(APP_SRC).toMatch(
      /path="\/dashboard\/work-orders\/board"[\s\S]*?<ProtectedRoute><ProductionBoardPage \/><\/ProtectedRoute>/,
    );
  });

  it("exposes a Production Board entry from the Work Orders page header", () => {
    expect(WO_PAGE_SRC).toMatch(/\/dashboard\/work-orders\/board/);
    expect(WO_PAGE_SRC).toMatch(/لوحة الإنتاج|Production Board/);
  });
});

describe("BUSINESS-WORKFLOW-7 page architecture", () => {
  it("uses listWorkOrdersForBoard wrapper, never raw supabase.from", () => {
    expect(PAGE_SRC).toMatch(/listWorkOrdersForBoard\(/);
    expect(PAGE_SRC).not.toMatch(/supabase\.from\(/);
  });

  it("renders all 10 board columns (measured → completed)", () => {
    expect(PAGE_SRC).toMatch(/BOARD_COLUMN_STAGES/);
    const stages = [
      "measured", "quoted", "approved", "engineering", "procurement",
      "fabrication", "qc", "ready", "installation", "completed",
    ];
    for (const s of stages) {
      expect(RULES_SRC).toContain(`"${s}"`);
    }
    // BOARD_COLUMN_STAGES has exactly 10 entries.
    const m = RULES_SRC.match(/BOARD_COLUMN_STAGES[\s\S]*?\[(.*?)\];/s);
    expect(m).not.toBeNull();
    const items = (m![1].match(/"/g) || []).length / 2;
    expect(items).toBe(10);
  });

  it("declares operations metrics labels (6 metrics)", () => {
    for (const key of [
      "activeCount", "overdue", "installToday", "qcBlocked",
      "awaitingApproval", "completedWeek",
    ]) {
      expect(PAGE_SRC).toContain(key);
    }
    expect(PAGE_SRC).toMatch(/bottleneck/);
  });

  it("provides filters (search, stage, priority, operator, overdue-only)", () => {
    expect(PAGE_SRC).toMatch(/setQuery/);
    expect(PAGE_SRC).toMatch(/stageFilter/);
    expect(PAGE_SRC).toMatch(/priorityFilter/);
    expect(PAGE_SRC).toMatch(/operatorFilter/);
    expect(PAGE_SRC).toMatch(/overdueOnly/);
  });

  it("stage move buttons delegate to transitionWorkOrderStage", () => {
    expect(PAGE_SRC).toMatch(/transitionWorkOrderStage\(/);
    expect(PAGE_SRC).toMatch(/getAllowedNextStages/);
  });

  it("assignment panel uses assignWorkOrderStageUser", () => {
    expect(PAGE_SRC).toMatch(/assignWorkOrderStageUser\(/);
  });

  it("ships mobile/responsive Tailwind classes", () => {
    expect(PAGE_SRC).toMatch(/\bsm:/);
    expect(PAGE_SRC).toMatch(/\blg:/);
  });
});

describe("BUSINESS-WORKFLOW-7 forbidden surfaces", () => {
  const FILES = [PAGE, "src/modules/workOrders/services/listWorkOrdersForBoard.ts"];

  it("no drag-and-drop libraries", () => {
    for (const f of FILES) {
      const src = read(f);
      expect(src, f).not.toMatch(/@dnd-kit/);
      expect(src, f).not.toMatch(/react-beautiful-dnd/);
      expect(src, f).not.toMatch(/\breact-dnd\b/);
    }
  });

  it("no realtime / channels / postgres_changes", () => {
    for (const f of FILES) {
      const src = read(f);
      expect(src, f).not.toMatch(/supabase\.channel\(/);
      expect(src, f).not.toMatch(/postgres_changes/);
      expect(src, f).not.toMatch(/\.subscribe\(/);
    }
  });

  it("no modal/dialog/popover imports on the page", () => {
    expect(PAGE_SRC).not.toMatch(/from\s+["']@\/components\/ui\/dialog["']/);
    expect(PAGE_SRC).not.toMatch(/from\s+["']@\/components\/ui\/alert-dialog["']/);
    expect(PAGE_SRC).not.toMatch(/from\s+["']@\/components\/ui\/popover["']/);
    expect(PAGE_SRC).not.toMatch(/<Dialog\b/);
    expect(PAGE_SRC).not.toMatch(/<AlertDialog\b/);
    expect(PAGE_SRC).not.toMatch(/<Popover\b/);
  });

  it("no payments / auth-mutation / membership module imports", () => {
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

  it("no external notification senders / direct contract / payment mutations", () => {
    expect(PAGE_SRC).not.toMatch(/sendEmail|sendSms|sendWhatsapp|enqueueNotification/);
    expect(PAGE_SRC).not.toMatch(/createContract\(/);
    expect(PAGE_SRC).not.toMatch(/createInvoice\(/);
    expect(PAGE_SRC).not.toMatch(/recordPayment\(/);
    expect(PAGE_SRC).not.toMatch(/createQuotation\(/);
  });
});

describe("BUSINESS-WORKFLOW-7 module barrel exposes board surface", () => {
  it("exports board service + rules", () => {
    expect(BARREL_SRC).toMatch(/listWorkOrdersForBoard/);
    expect(BARREL_SRC).toMatch(/BOARD_COLUMN_STAGES/);
    expect(BARREL_SRC).toMatch(/getAllowedNextStages/);
    expect(BARREL_SRC).toMatch(/isPipelineLocked/);
  });

  it("board service does not bypass module boundaries", () => {
    expect(SERVICE_SRC).not.toMatch(/supabase\.channel\(/);
    expect(SERVICE_SRC).not.toMatch(/postgres_changes/);
  });
});