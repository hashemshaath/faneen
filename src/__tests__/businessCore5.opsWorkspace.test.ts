import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const SRC = join(ROOT, "src");
const APP = join(SRC, "App.tsx");
const RESOLVER = join(SRC, "pages/ReferenceResolver.tsx");
const DETAIL = join(SRC, "pages/dashboard/DashboardWorkOrderDetail.tsx");
const SEARCH = join(SRC, "components/workOrders/WorkOrderSearchInput.tsx");
const BARREL = join(SRC, "modules/workOrders/index.ts");
const SEARCH_SVC = join(SRC, "modules/workOrders/services/searchWorkOrders.ts");
const BY_REF_SVC = join(SRC, "modules/workOrders/services/getWorkOrderByRefId.ts");

describe("BUSINESS-CORE-5: files exist", () => {
  it("ships detail page + search primitive + new service wrappers", () => {
    for (const f of [DETAIL, SEARCH, SEARCH_SVC, BY_REF_SVC]) {
      expect(existsSync(f)).toBe(true);
    }
  });
});

describe("BUSINESS-CORE-5: barrel exports", () => {
  const src = readFileSync(BARREL, "utf8");
  it("re-exports the new services", () => {
    expect(src).toMatch(/getWorkOrderByRefId/);
    expect(src).toMatch(/searchWorkOrders/);
  });
});

describe("BUSINESS-CORE-5: routing", () => {
  const app = readFileSync(APP, "utf8");
  it("registers /dashboard/work-orders/:refId detail route", () => {
    expect(app).toMatch(/path="\/dashboard\/work-orders\/:refId"/);
    expect(app).toMatch(/DashboardWorkOrderDetail/);
  });
  it("preserves overview + list routes", () => {
    expect(app).toMatch(/path="\/dashboard\/work-orders"/);
    expect(app).toMatch(/path="\/dashboard\/work-orders\/overview"/);
  });
});

describe("BUSINESS-CORE-5: ReferenceResolver WO- short-circuit", () => {
  const src = readFileSync(RESOLVER, "utf8");
  it("redirects WO- prefix to the workspace detail route", () => {
    expect(src).toMatch(/startsWith\(['"]WO-['"]\)/);
    expect(src).toMatch(/\/dashboard\/work-orders\//);
  });
});

describe("BUSINESS-CORE-5: detail page hygiene", () => {
  const src = readFileSync(DETAIL, "utf8");
  it("imports WO data only from the module barrel", () => {
    expect(src).toMatch(/from\s+["']@\/modules\/workOrders["']/);
    expect(src).not.toMatch(/supabase\.from\s*\(/);
    expect(src).not.toMatch(/from\(["']work_order/);
  });
  it("uses ReferenceTag and ReferenceBadge — never raw UUID primary label", () => {
    expect(src).toMatch(/ReferenceTag/);
    expect(src).toMatch(/ReferenceBadge/);
    expect(src).not.toMatch(/>\s*\{wo\.id\}\s*</);
  });
  it("declares noindex + bilingual loading state", () => {
    expect(src).toMatch(/useNoIndex/);
    expect(src).toMatch(/جارٍ|Loading/);
  });
  it("does not touch payment/auth/cron/notification surfaces (safe realtime hook allowed)", () => {
    expect(src).not.toMatch(/payments?\//i);
    expect(src).not.toMatch(/\/auth\//i);
    expect(src).not.toMatch(/cron|scheduler/i);
    expect(src).not.toMatch(/notifications?\//i);
    // Inline realtime forbidden; the vetted useWorkOrderRealtimeInvalidation hook is allowed.
    expect(src).not.toMatch(/\.channel\(/);
    expect(src).not.toMatch(/postgres_changes/);
    expect(src.replace(/useWorkOrderRealtimeInvalidation/g, "")).not.toMatch(/realtime/i);
  });
});

describe("BUSINESS-CORE-5: search primitive hygiene", () => {
  const src = readFileSync(SEARCH, "utf8");
  it("uses module barrel — no direct table access", () => {
    expect(src).toMatch(/from\s+["']@\/modules\/workOrders["']/);
    expect(src).not.toMatch(/supabase\.from\s*\(/);
    expect(src).not.toMatch(/from\(["']work_order/);
  });
  it("links to the detail route via /dashboard/work-orders/:refId pattern", () => {
    expect(src).toMatch(/\/dashboard\/work-orders\/\$\{/);
  });
});

describe("BUSINESS-CORE-5: search service sanitises wildcards", () => {
  const src = readFileSync(SEARCH_SVC, "utf8");
  it("strips ILIKE/PostgREST meta-characters before building the pattern", () => {
    expect(src).toMatch(/replace\(\/\[%,_\(\)\*\]\/g/);
    expect(src).toMatch(/\.or\(/);
    expect(src).toMatch(/business_id/);
  });
});