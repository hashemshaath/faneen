import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const SRC = join(ROOT, "src");
const APP = join(SRC, "App.tsx");
const RESOLVER = join(SRC, "pages/ReferenceResolver.tsx");
const LIST = join(SRC, "pages/dashboard/DashboardWorkOrders.tsx");
const DETAIL = join(SRC, "pages/dashboard/DashboardWorkOrderDetail.tsx");
const SEARCH = join(SRC, "components/workOrders/WorkOrderSearchInput.tsx");
const BARREL = join(SRC, "modules/workOrders/index.ts");
const TASK_SVC = join(SRC, "modules/workOrders/services/getWorkOrderTaskByRefId.ts");
const ASSIGNEE_HOOK = join(SRC, "modules/workOrders/lib/useAssigneeNames.ts");

describe("BUSINESS-CORE-6: files exist", () => {
  it("ships task-by-ref wrapper and assignee hook", () => {
    for (const f of [TASK_SVC, ASSIGNEE_HOOK]) expect(existsSync(f)).toBe(true);
  });
});

describe("BUSINESS-CORE-6: barrel exports", () => {
  const src = readFileSync(BARREL, "utf8");
  it("re-exports new wrappers/hooks", () => {
    expect(src).toMatch(/getWorkOrderTaskByRefId/);
    expect(src).toMatch(/useAssigneeNames/);
  });
});

describe("BUSINESS-CORE-6: search integration on list page", () => {
  const src = readFileSync(LIST, "utf8");
  it("mounts WorkOrderSearchInput in header", () => {
    expect(src).toMatch(/WorkOrderSearchInput/);
    expect(src).toMatch(/from "@\/components\/workOrders\/WorkOrderSearchInput"/);
  });
  it("still has no direct table access", () => {
    expect(src).not.toMatch(/supabase\.from\(["']work_order/);
  });
});

describe("BUSINESS-CORE-6: assignee hook hygiene", () => {
  const src = readFileSync(ASSIGNEE_HOOK, "utf8");
  it("uses users module wrapper only", () => {
    expect(src).toMatch(/from "@\/modules\/users"/);
    expect(src).toMatch(/listProfilesByUserIds/);
    expect(src).not.toMatch(/supabase\.from\(/);
  });
  it("never references synthetic phone email or auth email", () => {
    expect(src).not.toMatch(/@phone\.qitaat\.local/);
    expect(src).not.toMatch(/auth\.users/);
  });
});

describe("BUSINESS-CORE-6: TASK- resolver branch", () => {
  const src = readFileSync(RESOLVER, "utf8");
  it("handles TASK- prefix via wrapper and redirects to WO detail with task param", () => {
    expect(src).toMatch(/startsWith\(['"]TASK-['"]\)/);
    expect(src).toMatch(/getWorkOrderTaskByRefId/);
    expect(src).toMatch(/\?task=\$\{/);
  });
  it("preserves WO- short-circuit", () => {
    expect(src).toMatch(/startsWith\(['"]WO-['"]\)/);
  });
});

describe("BUSINESS-CORE-6: detail page wires assignee + task highlight", () => {
  const src = readFileSync(DETAIL, "utf8");
  it("imports useAssigneeNames from module barrel", () => {
    expect(src).toMatch(/useAssigneeNames/);
    expect(src).toMatch(/from\s+["']@\/modules\/workOrders["']/);
  });
  it("reads ?task= and highlights matching task", () => {
    expect(src).toMatch(/useSearchParams/);
    expect(src).toMatch(/highlightTaskRef/);
  });
  it("does not render raw UUID or synthetic emails", () => {
    expect(src).not.toMatch(/@phone\.qitaat\.local/);
    expect(src).not.toMatch(/>\s*\{wo\.id\}\s*</);
  });
});

describe("BUSINESS-CORE-6: safety exclusions", () => {
  const files = [RESOLVER, LIST, DETAIL, SEARCH, TASK_SVC, ASSIGNEE_HOOK];
  for (const f of files) {
    it(`${f.split("/").slice(-2).join("/")} avoids cron/realtime/notifications/auth/payment`, () => {
      const src = readFileSync(f, "utf8");
      expect(src).not.toMatch(/\bcron\b|scheduler/i);
      expect(src).not.toMatch(/\.channel\(/);
      expect(src).not.toMatch(/realtime/i);
      expect(src).not.toMatch(/notifications?\//i);
      expect(src).not.toMatch(/\/auth\//i);
      expect(src).not.toMatch(/payments?\//i);
    });
  }
});

describe("BUSINESS-CORE-6: app routes preserved", () => {
  const app = readFileSync(APP, "utf8");
  it("keeps /r/:refId, /dashboard/work-orders, overview, detail routes", () => {
    expect(app).toMatch(/path="\/r\/:refId"/);
    expect(app).toMatch(/path="\/dashboard\/work-orders"/);
    expect(app).toMatch(/path="\/dashboard\/work-orders\/overview"/);
    expect(app).toMatch(/path="\/dashboard\/work-orders\/:refId"/);
  });
});