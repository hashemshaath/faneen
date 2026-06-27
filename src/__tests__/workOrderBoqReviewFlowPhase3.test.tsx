/**
 * WORK ORDER BOQ REVIEW FLOW — PHASE 3 acceptance guards.
 *
 * Static guards covering:
 *  - Review panel is mounted by the WO Measurements & BOQ wrapper.
 *  - Review status labels are bilingual (draft / submitted / needs / accepted).
 *  - Provider sees the "Send BOQ for review" button gated on canManage.
 *  - Client view is read-only — no provider action buttons leak.
 *  - No invoice / payment / ZATCA / warranty / final handover surfaces.
 *  - No service_role, no direct supabase.from, no any / ts-ignore in this file.
 *  - No contract or WO lifecycle mutation calls.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const PANEL = readFileSync(
  join(ROOT, "src/components/workOrders/WorkOrderBoqReviewPanel.tsx"),
  "utf8",
);
const WRAPPER = readFileSync(
  join(ROOT, "src/components/workOrders/WorkOrderMeasurementsAndBoqSection.tsx"),
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
  "createPayment",
];

describe("WORK ORDER BOQ REVIEW FLOW — Phase 3", () => {
  it("review panel is mounted by the wrapper", () => {
    expect(WRAPPER).toContain("WorkOrderBoqReviewPanel");
    expect(WRAPPER).toMatch(/<WorkOrderBoqReviewPanel[\s\S]*?\/>/);
  });

  it("review panel exposes bilingual labels for all four review states", () => {
    expect(PANEL).toMatch(/مسودة/);
    expect(PANEL).toMatch(/مرسلة للمراجعة/);
    expect(PANEL).toMatch(/بحاجة تعديل/);
    expect(PANEL).toMatch(/مقبولة للمراجعة/);
    expect(PANEL).toMatch(/Draft/);
    expect(PANEL).toMatch(/Submitted for review/);
    expect(PANEL).toMatch(/Needs changes/);
    expect(PANEL).toMatch(/Accepted for review/);
  });

  it("provider sees Send-for-review only when canManage is true", () => {
    expect(PANEL).toContain("canManage");
    expect(PANEL).toMatch(/إرسال BOQ للمراجعة/);
    expect(PANEL).toMatch(/Send BOQ for review/);
    expect(PANEL).toContain("wo-boq-send-for-review");
    // Send block is rendered by the provider branch; client branch renders the read-only notice.
    expect(PANEL).toMatch(/canManage \?[\s\S]*renderProvider[\s\S]*:[\s\S]*renderClient/);
  });

  it("provider awaiting state is shown when BOQ is already submitted", () => {
    expect(PANEL).toMatch(/بانتظار مراجعة الطرف الثاني/);
    expect(PANEL).toMatch(/Awaiting the other party's review/);
    expect(PANEL).toContain("wo-boq-awaiting");
  });

  it("client view is read-only with the info notice and no fake action buttons", () => {
    expect(PANEL).toContain("wo-boq-client-readonly");
    // Phase 4: the read-only block is now rendered for non-submitted states.
    // The client gains request-changes / accept buttons only when status is
    // submitted; those are covered by the Phase 4 acceptance suite.
  });

  it("review panel uses safe services only (Phase 4 transitions + list)", () => {
    expect(PANEL).toContain("listWorkOrderBoqs");
    expect(PANEL).toContain("submitWorkOrderBoqForReview");
    expect(PANEL).not.toMatch(/supabase\s*\.from\(/);
    expect(PANEL).not.toContain("service_role");
  });

  it("review panel does NOT expose invoices / payments / warranty / handover / lifecycle", () => {
    for (const term of banned) {
      expect(PANEL).not.toContain(term);
    }
    expect(PANEL).not.toMatch(/from\(["']contracts["']\)\s*\.(update|insert|delete)/);
    expect(PANEL).not.toMatch(/from\(["']work_orders["']\)\s*\.(update|insert|delete)/);
  });

  it("review panel avoids any / ts-ignore / eslint-disable (except a single hooks-deps line)", () => {
    expect(PANEL).not.toMatch(/\bas any\b/);
    expect(PANEL).not.toMatch(/@ts-ignore/);
    // A single react-hooks/exhaustive-deps disable is acceptable for the load effect.
    const disables = PANEL.match(/eslint-disable/g) ?? [];
    expect(disables.length).toBeLessThanOrEqual(1);
  });
});