import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const SRC = join(process.cwd(), "src");
const CREATE = join(SRC, "modules/workOrders/services/createWorkOrder.ts");
const DETAIL = join(SRC, "pages/dashboard/DashboardWorkOrderDetail.tsx");
const LIST = join(SRC, "pages/dashboard/DashboardWorkOrders.tsx");
const RESOLVER = join(SRC, "pages/ReferenceResolver.tsx");

const SERVICE_FILES = [
  "createWorkOrder.ts",
  "getWorkOrderById.ts",
  "listWorkOrdersForBusiness.ts",
  "updateWorkOrder.ts",
  "getWorkOrderByRefId.ts",
  "searchWorkOrders.ts",
].map((f) => join(SRC, "modules/workOrders/services", f));

describe("BUSINESS-CORE-7: service select shape", () => {
  for (const f of SERVICE_FILES) {
    it(`${f.split("/").pop()} selects source_ref_id alongside source_id`, () => {
      const src = readFileSync(f, "utf8");
      expect(src).toMatch(/source_id, source_ref_id/);
      // source_id is preserved
      expect(src).toMatch(/source_id/);
    });
  }
});

describe("BUSINESS-CORE-7: createWorkOrder accepts + validates source_ref_id", () => {
  const src = readFileSync(CREATE, "utf8");
  it("declares source_ref_id input", () => {
    expect(src).toMatch(/source_ref_id\?\s*:\s*string\s*\|\s*null/);
  });
  it("validates with the same uppercase pattern as the DB check", () => {
    expect(src).toMatch(/\^\[A-Z\]\{2,6\}-\[A-Z0-9\]\+\$/);
  });
  it("never derives a ref from a UUID — pattern enforces uppercase letters/digits only", () => {
    expect(src).not.toMatch(/source_ref_id\s*=\s*input\.source_id/);
  });
});

describe("BUSINESS-CORE-7: detail page renders source_ref_id safely", () => {
  const src = readFileSync(DETAIL, "utf8");
  it("wraps source_ref_id in ReferenceTag (not raw UUID)", () => {
    expect(src).toMatch(/wo\.source_ref_id\s*&&[\s\S]*ReferenceTag/);
    expect(src).not.toMatch(/>\s*\{wo\.source_id\}\s*</);
  });
});

describe("BUSINESS-CORE-7: list page shows source_ref badge but never UUID", () => {
  const src = readFileSync(LIST, "utf8");
  it("renders ReferenceBadge for source_ref_id", () => {
    expect(src).toMatch(/o\.source_ref_id\s*&&[\s\S]*ReferenceBadge/);
  });
  it("does not render o.source_id as primary label", () => {
    expect(src).not.toMatch(/>\s*\{o\.source_id\}\s*</);
  });
});

describe("BUSINESS-CORE-7: safety", () => {
  for (const f of [CREATE, DETAIL, LIST]) {
    it(`${f.split("/").pop()} avoids cron/realtime/notifications/auth/payment`, () => {
      const src = readFileSync(f, "utf8");
      expect(src).not.toMatch(/\bcron\b|scheduler/i);
      expect(src).not.toMatch(/\.channel\(/);
      expect(src).not.toMatch(/realtime/i);
      expect(src).not.toMatch(/notifications?\//i);
      expect(src).not.toMatch(/\/auth\//i);
      expect(src).not.toMatch(/payments?\//i);
    });
  }
  it("ReferenceResolver preserves WO + TASK short-circuits", () => {
    const src = readFileSync(RESOLVER, "utf8");
    expect(src).toMatch(/startsWith\(['"]WO-['"]\)/);
    expect(src).toMatch(/startsWith\(['"]TASK-['"]\)/);
  });
});