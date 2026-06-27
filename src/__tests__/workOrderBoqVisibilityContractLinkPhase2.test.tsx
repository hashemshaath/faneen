/**
 * WORK ORDER BOQ VISIBILITY + CONTRACT LINK — PHASE 2 acceptance tests.
 *
 * Static guards covering:
 *  - WO summary card mounted in the wrapper, bilingual, shows count testids.
 *  - Read-only mode signal when canManage=false.
 *  - Contract page mounts ContractWorkOrderBoqSummary with "Open work order".
 *  - No invoice / payment / ZATCA / lifecycle mutation surfaces leak.
 *  - No service_role, no direct supabase.from, no any / ts-ignore.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const SUMMARY = readFileSync(
  join(ROOT, "src/components/workOrders/WorkOrderMeasurementsBoqSummary.tsx"),
  "utf8",
);
const WRAPPER = readFileSync(
  join(ROOT, "src/components/workOrders/WorkOrderMeasurementsAndBoqSection.tsx"),
  "utf8",
);
const CONTRACT_SUMMARY = readFileSync(
  join(ROOT, "src/components/contracts/ContractWorkOrderBoqSummary.tsx"),
  "utf8",
);
const CONTRACT_PAGE = readFileSync(
  join(ROOT, "src/pages/ContractDetail.tsx"),
  "utf8",
);

const banned = [
  "createInvoice",
  "Invoice",
  "ZATCA",
  "escrow",
  "finalHandover",
  "warrantyActivate",
  "activateContract",
  "cancelContract",
];

describe("WORK ORDER BOQ VISIBILITY + CONTRACT LINK — Phase 2", () => {
  it("WO summary is mounted by the wrapper", () => {
    expect(WRAPPER).toContain("WorkOrderMeasurementsBoqSummary");
    expect(WRAPPER).toMatch(/<WorkOrderMeasurementsBoqSummary[\s\S]*?\/>/);
  });

  it("WO summary exposes bilingual labels and count testids", () => {
    expect(SUMMARY).toMatch(/ملخص القياسات/);
    expect(SUMMARY).toMatch(/Measurements & BOQ summary/);
    expect(SUMMARY).toContain("wo-summary-measurements-count");
    expect(SUMMARY).toContain("wo-summary-boq-count");
    expect(SUMMARY).toMatch(/الحالة|Status/);
  });

  it("WO summary signals read-only when canManage=false", () => {
    expect(SUMMARY).toContain("!canManage");
    expect(SUMMARY).toMatch(/للقراءة فقط|read-only/);
  });

  it("WO summary uses existing listing services, never direct supabase or service_role", () => {
    expect(SUMMARY).toContain("listWorkOrderMeasurements");
    expect(SUMMARY).toContain("listWorkOrderBoqs");
    expect(SUMMARY).not.toMatch(/supabase\s*\.from\(/);
    expect(SUMMARY).not.toContain("service_role");
  });

  it("Contract summary surfaces work-order ref + Open work order link", () => {
    expect(CONTRACT_SUMMARY).toMatch(/مسودة BOQ المرتبطة بأمر العمل/);
    expect(CONTRACT_SUMMARY).toMatch(/BOQ draft linked to work order/);
    expect(CONTRACT_SUMMARY).toMatch(/فتح أمر العمل|Open work order/);
    expect(CONTRACT_SUMMARY).toMatch(/\/dashboard\/work-orders\/\$\{workOrder\.ref_id\}/);
  });

  it("Contract summary uses the shared WO-by-source hook (no duplicate fetch)", () => {
    expect(CONTRACT_SUMMARY).toContain("useExistingWorkOrderForSource");
    expect(CONTRACT_SUMMARY).toContain("listWorkOrderBoqs");
    expect(CONTRACT_SUMMARY).not.toMatch(/supabase\s*\.from\(/);
    expect(CONTRACT_SUMMARY).not.toContain("service_role");
  });

  it("Contract page mounts the summary near the create-WO affordance", () => {
    expect(CONTRACT_PAGE).toContain("ContractWorkOrderBoqSummary");
    expect(CONTRACT_PAGE).toMatch(/<ContractWorkOrderBoqSummary[\s\S]*?\/>/);
  });

  it("Neither phase-2 component exposes invoices / payments / lifecycle mutations", () => {
    for (const term of banned) {
      expect(SUMMARY).not.toContain(term);
      expect(CONTRACT_SUMMARY).not.toContain(term);
    }
    expect(CONTRACT_SUMMARY).not.toMatch(/from\(["']contracts["']\)\s*\.(update|insert|delete)/);
    expect(SUMMARY).not.toMatch(/from\(["']work_orders["']\)\s*\.(update|insert|delete)/);
  });

  it("Phase-2 components avoid any / ts-ignore / eslint-disable", () => {
    for (const src of [SUMMARY, CONTRACT_SUMMARY]) {
      expect(src).not.toMatch(/\bas any\b/);
      expect(src).not.toMatch(/@ts-ignore/);
      expect(src).not.toMatch(/eslint-disable/);
    }
  });
});