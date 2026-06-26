/**
 * WORK ORDER DETAIL + MILESTONES — PHASE 1 acceptance tests.
 *
 * Static guards:
 *  - Operational summary component renders the required Phase 1 fields.
 *  - Detail page mounts the summary card.
 *  - No payments / escrow / warranty / final handover / contract lifecycle
 *    mutations leak into the detail surface.
 *  - No `service_role` references in the frontend page.
 *  - No `any` / `ts-ignore` / `eslint-disable` slipped in.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const SUMMARY = readFileSync(
  join(ROOT, "src/components/workOrders/WorkOrderOperationalSummary.tsx"),
  "utf8",
);
const PAGE = readFileSync(
  join(ROOT, "src/pages/dashboard/DashboardWorkOrderDetail.tsx"),
  "utf8",
);

describe("WORK ORDER DETAIL + MILESTONES — Phase 1", () => {
  it("Operational summary exposes the required Phase 1 data labels", () => {
    for (const ar of [
      "رقم أمر العمل",
      "العقد المرتبط",
      "العميل",
      "مزود الخدمة",
      "الموقع",
      "نطاق العمل",
      "تاريخ الإنشاء",
      "آخر تحديث",
    ]) {
      expect(SUMMARY).toContain(ar);
    }
  });

  it("Operational summary exposes a Back-to-contract link", () => {
    expect(SUMMARY).toMatch(/Back to contract|العودة للعقد/);
    expect(SUMMARY).toMatch(/to=\{`\/r\/\$\{contractRef\}`\}/);
  });

  it("Detail page mounts the operational summary", () => {
    expect(PAGE).toContain("WorkOrderOperationalSummary");
    expect(PAGE).toMatch(/<WorkOrderOperationalSummary[^/]*\/>/);
  });

  it("Detail page does not perform direct work_orders writes", () => {
    // Comments are an existing channel; we only forbid direct stage/status writes.
    expect(PAGE).not.toMatch(/from\(["']work_orders["']\)\s*\.update/);
    expect(PAGE).not.toMatch(/from\(["']work_order_stages["']\)\s*\.(update|insert|delete)/);
  });

  it("Detail page does not create new Work Orders", () => {
    expect(PAGE).not.toContain("createWorkOrderFromContract");
    expect(PAGE).not.toContain("CreateWorkOrderFromContractButton");
  });

  it("Detail page does not mutate contract lifecycle", () => {
    expect(PAGE).not.toMatch(/from\(["']contracts["']\)\s*\.(update|insert|delete)/);
    expect(PAGE).not.toContain("activateContract");
    expect(PAGE).not.toContain("cancelContract");
  });

  it("Detail page does not surface payments / escrow / warranty / final handover", () => {
    for (const banned of ["escrow", "ZATCA", "createInvoice", "finalHandover", "warrantyActivate"]) {
      expect(PAGE).not.toContain(banned);
    }
  });

  it("Detail page contains no service_role usage", () => {
    expect(PAGE).not.toContain("service_role");
    expect(SUMMARY).not.toContain("service_role");
  });

  it("Phase 1 surface uses no any / ts-ignore / eslint-disable", () => {
    expect(SUMMARY).not.toMatch(/\bas any\b/);
    expect(SUMMARY).not.toMatch(/@ts-ignore/);
    expect(SUMMARY).not.toMatch(/eslint-disable/);
  });
});