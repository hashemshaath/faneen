/**
 * WORK ORDER EVIDENCE + SITE VISIT / MEASUREMENT DOCUMENTS — Phase 1 guards.
 *
 * Static checks: the read-only "أدلة المعاينة والقياسات" surface exists,
 * groups attachments by operational stage, opens files via signed URLs only,
 * and never reaches for getPublicUrl, service_role, public buckets, or
 * lifecycle mutations from the component.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const EVIDENCE = readFileSync(
  join(ROOT, "src/components/workOrders/WorkOrderEvidenceSection.tsx"),
  "utf8",
);
const PAGE = readFileSync(
  join(ROOT, "src/pages/dashboard/DashboardWorkOrderDetail.tsx"),
  "utf8",
);

describe("WORK ORDER EVIDENCE — Phase 1", () => {
  it("exposes the bilingual section title and empty state", () => {
    expect(EVIDENCE).toContain("أدلة المعاينة والقياسات");
    expect(EVIDENCE).toContain("Site visit & measurement evidence");
    expect(EVIDENCE).toContain("لا توجد أدلة مرفقة حتى الآن");
    expect(EVIDENCE).toContain("No evidence attached yet");
  });

  it("groups evidence by operational stage", () => {
    for (const stage of [
      "site_visit",
      "measurements",
      "production_preparation",
      "installation",
      "initial_handover",
    ]) {
      expect(EVIDENCE).toContain(stage);
    }
  });

  it("opens files via short-lived signed URLs, never getPublicUrl", () => {
    expect(EVIDENCE).toContain("getWorkOrderAttachmentPreviewUrl");
    expect(EVIDENCE).not.toContain("getPublicUrl");
  });

  it("does not write to storage or DB from the component", () => {
    expect(EVIDENCE).not.toMatch(/supabase\.storage/);
    expect(EVIDENCE).not.toMatch(/\.from\(["'][a-z_]+["']\)\s*\.(insert|update|delete|upsert)/);
    expect(EVIDENCE).not.toContain("insertWorkOrderAttachment");
    expect(EVIDENCE).not.toContain("softDeleteWorkOrderAttachment");
  });

  it("contains no service_role / any / ts-ignore / eslint-disable", () => {
    expect(EVIDENCE).not.toContain("service_role");
    expect(EVIDENCE).not.toMatch(/\bas any\b/);
    expect(EVIDENCE).not.toMatch(/@ts-ignore/);
    expect(EVIDENCE).not.toMatch(/eslint-disable/);
  });

  it("does not mutate work order or contract lifecycle", () => {
    for (const banned of [
      "escrow",
      "ZATCA",
      "createInvoice",
      "finalHandover",
      "warrantyActivate",
      "activateContract",
      "completeWorkOrder",
    ]) {
      expect(EVIDENCE).not.toContain(banned);
    }
  });

  it("is mounted by the Work Order detail page", () => {
    expect(PAGE).toContain("WorkOrderEvidenceSection");
    expect(PAGE).toMatch(/<WorkOrderEvidenceSection[\s\S]*?\/>/);
  });
});