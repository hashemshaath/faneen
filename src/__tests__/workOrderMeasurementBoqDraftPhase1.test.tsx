/**
 * WORK ORDER MEASUREMENT SHEET + BOQ DRAFT — PHASE 1 acceptance tests.
 *
 * Static guards covering the wrapper section and its host page:
 *  - Section title + draft notice + empty-state are present.
 *  - The wrapper renders both Measurements and BOQ surfaces with `canManage`.
 *  - No payments / ZATCA / escrow / warranty / final handover / contract or
 *    work-order lifecycle mutation surfaces leak into the section or the page.
 *  - No `service_role` references, no direct `supabase.from(...).insert/update`
 *    inside the wrapper component (it routes via the workOrders module).
 *  - No `any` / `ts-ignore` / `eslint-disable` slipped in.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const WRAPPER = readFileSync(
  join(ROOT, "src/components/workOrders/WorkOrderMeasurementsAndBoqSection.tsx"),
  "utf8",
);
const MEAS = readFileSync(
  join(ROOT, "src/components/workOrders/WorkOrderMeasurementsSection.tsx"),
  "utf8",
);
const BOQ = readFileSync(
  join(ROOT, "src/components/workOrders/WorkOrderBoqSection.tsx"),
  "utf8",
);
const PAGE = readFileSync(
  join(ROOT, "src/pages/dashboard/DashboardWorkOrderDetail.tsx"),
  "utf8",
);

describe("WORK ORDER MEASUREMENT SHEET + BOQ DRAFT — Phase 1", () => {
  it("Wrapper exposes the bilingual section title", () => {
    expect(WRAPPER).toContain("القياسات والكميات");
    expect(WRAPPER).toContain("Measurements & Quantities");
  });

  it("Wrapper renders the draft-not-invoice notice (AR + EN)", () => {
    expect(WRAPPER).toMatch(/مسودة تشغيلية وليست فاتورة/);
    expect(WRAPPER).toMatch(/operational draft — NOT an invoice or final approval/);
  });

  it("Wrapper signals client read-only mode", () => {
    expect(WRAPPER).toContain("!canManage");
    expect(WRAPPER).toMatch(/read-only|للقراءة فقط/);
  });

  it("Wrapper mounts both Measurements and BOQ surfaces", () => {
    expect(WRAPPER).toContain("WorkOrderMeasurementsSection");
    expect(WRAPPER).toContain("WorkOrderBoqSection");
    expect(WRAPPER).toMatch(/canManage=\{canManage\}/);
  });

  it("Detail page mounts the wrapper instead of the individual sections", () => {
    expect(PAGE).toContain("WorkOrderMeasurementsAndBoqSection");
    expect(PAGE).toMatch(/<WorkOrderMeasurementsAndBoqSection[\s\S]*?\/>/);
  });

  it("Measurements section keeps a bilingual empty state", () => {
    expect(MEAS).toMatch(/لا توجد مقاسات/);
    expect(MEAS).toMatch(/No measurements yet/);
  });

  it("BOQ section keeps a bilingual empty state", () => {
    expect(BOQ).toMatch(/لا توجد جداول كميات/);
    expect(BOQ).toMatch(/No bills of quantities/);
  });

  it("BOQ section exposes unit / quantity / line columns", () => {
    expect(BOQ).toMatch(/unit:\s*isRTL\s*\?\s*"الوحدة"/);
    expect(BOQ).toMatch(/qty:\s*isRTL\s*\?\s*"الكمية"/);
    expect(BOQ).toMatch(/lineTotal:/);
  });

  it("Measurements + BOQ surfaces gate management actions on canManage", () => {
    expect(MEAS).toMatch(/canManage\s*&&/);
    expect(BOQ).toMatch(/canManage\s*&&/);
  });

  it("Wrapper does not surface invoices / payments / ZATCA / escrow / warranty / final handover", () => {
    for (const banned of [
      "escrow",
      "ZATCA",
      "createInvoice",
      "Invoice",
      "finalHandover",
      "warrantyActivate",
      "payment",
    ]) {
      expect(WRAPPER).not.toContain(banned);
    }
  });

  it("Wrapper does not mutate contract / work-order lifecycle", () => {
    expect(WRAPPER).not.toContain("activateContract");
    expect(WRAPPER).not.toContain("cancelContract");
    expect(WRAPPER).not.toMatch(/from\(["']contracts["']\)\s*\.(update|insert|delete)/);
    expect(WRAPPER).not.toMatch(/from\(["']work_orders["']\)\s*\.(update|insert|delete)/);
    expect(WRAPPER).not.toMatch(/from\(["']work_order_stages["']\)\s*\.(update|insert|delete)/);
    expect(WRAPPER).not.toMatch(/from\(["']contract_milestones["']\)\s*\.(update|insert|delete)/);
  });

  it("Wrapper contains no service_role and no direct unsafe writes", () => {
    expect(WRAPPER).not.toContain("service_role");
    expect(WRAPPER).not.toMatch(/supabase\s*\.from\(/);
    expect(WRAPPER).not.toMatch(/supabase\s*\.storage/);
  });

  it("Measurements + BOQ components route writes through the workOrders module (no direct supabase from component)", () => {
    expect(MEAS).not.toMatch(/supabase\s*\.from\(/);
    expect(BOQ).not.toMatch(/supabase\s*\.from\(/);
    expect(MEAS).not.toContain("service_role");
    expect(BOQ).not.toContain("service_role");
  });

  it("Wrapper uses no any / ts-ignore / eslint-disable", () => {
    expect(WRAPPER).not.toMatch(/\bas any\b/);
    expect(WRAPPER).not.toMatch(/@ts-ignore/);
    expect(WRAPPER).not.toMatch(/eslint-disable/);
  });
});