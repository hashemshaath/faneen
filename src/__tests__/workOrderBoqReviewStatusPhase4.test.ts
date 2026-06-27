/**
 * WORK ORDER BOQ REVIEW STATUS — PHASE 4 acceptance suite.
 *
 * Mix of:
 *  - Static guards on the panel & services (no privileged keys, no direct
 *    component updates, no billing surfaces).
 *  - FSM unit tests over the central transitions helper.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  WORK_ORDER_BOQ_REVIEW_STATUSES,
  WORK_ORDER_BOQ_REVIEW_TRANSITIONS,
  isAllowedBoqReviewTransition,
  type WorkOrderBoqReviewStatus,
} from "@/modules/workOrders/types";

const ROOT = process.cwd();
const read = (p: string) => readFileSync(join(ROOT, p), "utf8");

const PANEL = read("src/components/workOrders/WorkOrderBoqReviewPanel.tsx");
const SERVICE = read(
  "src/modules/workOrders/services/transitionWorkOrderBoqReview.ts",
);

const BILLING_BANNED = [
  "createInvoice",
  "Invoice",
  "ZATCA",
  "escrow",
  "finalHandover",
  "warrantyActivate",
  "createPayment",
  "activateContract",
  "cancelContract",
];

describe("WORK ORDER BOQ REVIEW STATUS — Phase 4 (status model)", () => {
  it("exports all four review statuses with stable values", () => {
    expect(WORK_ORDER_BOQ_REVIEW_STATUSES).toEqual([
      "draft",
      "submitted",
      "needs_changes",
      "accepted",
    ]);
  });

  it("allows exactly the four FSM transitions documented in the brief", () => {
    const allowed = new Set(
      WORK_ORDER_BOQ_REVIEW_TRANSITIONS.map(([f, t]) => `${f}->${t}`),
    );
    expect(allowed).toEqual(
      new Set([
        "draft->submitted",
        "submitted->needs_changes",
        "needs_changes->submitted",
        "submitted->accepted",
      ]),
    );
  });

  it("forbids the dangerous transitions called out in the brief", () => {
    const forbidden: Array<[WorkOrderBoqReviewStatus, WorkOrderBoqReviewStatus]> = [
      ["accepted", "draft"],
      ["accepted", "needs_changes"],
      ["accepted", "submitted"],
      ["draft", "accepted"],
      ["draft", "needs_changes"],
      ["needs_changes", "accepted"],
    ];
    for (const [from, to] of forbidden) {
      expect(isAllowedBoqReviewTransition(from, to)).toBe(false);
    }
  });

  it("accepts the canonical happy-path transitions", () => {
    expect(isAllowedBoqReviewTransition("draft", "submitted")).toBe(true);
    expect(isAllowedBoqReviewTransition("submitted", "needs_changes")).toBe(true);
    expect(isAllowedBoqReviewTransition("needs_changes", "submitted")).toBe(true);
    expect(isAllowedBoqReviewTransition("submitted", "accepted")).toBe(true);
  });
});

describe("WORK ORDER BOQ REVIEW STATUS — Phase 4 (service guards)", () => {
  it("service file exposes the three Phase 4 transition helpers", () => {
    expect(SERVICE).toMatch(/export function submitWorkOrderBoqForReview/);
    expect(SERVICE).toMatch(/export function requestWorkOrderBoqChanges/);
    expect(SERVICE).toMatch(/export function acceptWorkOrderBoqReview/);
  });

  it("service routes every transition through the FSM guard", () => {
    expect(SERVICE).toContain("isAllowedBoqReviewTransition");
    expect(SERVICE).toMatch(/invalid_transition/);
  });

  it("service uses the audit recorder and never references service_role", () => {
    expect(SERVICE).toContain("recordWorkOrderAudit");
    expect(SERVICE).toMatch(/boq_review_submitted/);
    expect(SERVICE).toMatch(/boq_review_changes_requested/);
    expect(SERVICE).toMatch(/boq_review_accepted/);
    expect(SERVICE).not.toContain("service_role");
    expect(SERVICE).not.toMatch(/\bas any\b/);
    expect(SERVICE).not.toMatch(/@ts-ignore/);
  });

  it("service has no billing / payment / warranty / handover surfaces", () => {
    for (const term of BILLING_BANNED) {
      expect(SERVICE).not.toContain(term);
    }
    // No contract or WO lifecycle table mutation.
    expect(SERVICE).not.toMatch(/from\(["']contracts["']\)\s*\.(update|insert|delete)/);
    expect(SERVICE).not.toMatch(/from\(["']work_orders["']\)\s*\.(update|insert|delete)/);
  });
});

describe("WORK ORDER BOQ REVIEW STATUS — Phase 4 (UI guards)", () => {
  it("panel reads review_status (not technical status) to drive the UI", () => {
    expect(PANEL).toContain("review_status");
    expect(PANEL).toContain("WorkOrderBoqReviewStatus");
  });

  it("provider can submit when status is draft OR needs_changes", () => {
    expect(PANEL).toMatch(/إرسال BOQ للمراجعة/);
    expect(PANEL).toMatch(/Send BOQ for review/);
    expect(PANEL).toContain("wo-boq-send-for-review");
    expect(PANEL).toMatch(/s === "draft" \|\| s === "needs_changes"/);
  });

  it("provider sees an awaiting notice while status is submitted", () => {
    expect(PANEL).toContain("wo-boq-awaiting");
    expect(PANEL).toMatch(/بانتظار مراجعة الطرف الثاني/);
  });

  it("client gets request-changes + accept ONLY when status is submitted", () => {
    expect(PANEL).toContain("wo-boq-client-actions");
    expect(PANEL).toContain("wo-boq-client-request-changes");
    expect(PANEL).toContain("wo-boq-client-accept");
    expect(PANEL).toMatch(/طلب تعديل/);
    expect(PANEL).toMatch(/قبول المراجعة/);
    // The action block is gated on the submitted state inside renderClient.
    expect(PANEL).toMatch(
      /renderClient[\s\S]*if \(s === "submitted"\)[\s\S]*wo-boq-client-actions/,
    );
  });

  it("client read-only notices cover draft / needs_changes / accepted", () => {
    expect(PANEL).toContain("wo-boq-client-readonly");
    expect(PANEL).toMatch(/لم يتم إرسال BOQ للمراجعة بعد/);
    expect(PANEL).toMatch(/تم إرسال طلب تعديل إلى الجهة المنفذة/);
    expect(PANEL).toMatch(/تم قبول مراجعة BOQ/);
  });

  it("panel calls Phase 4 services and never writes work_order_boqs directly", () => {
    expect(PANEL).toContain("submitWorkOrderBoqForReview");
    expect(PANEL).toContain("requestWorkOrderBoqChanges");
    expect(PANEL).toContain("acceptWorkOrderBoqReview");
    expect(PANEL).not.toMatch(/supabase\s*\.from\(/);
    expect(PANEL).not.toMatch(
      /from\(["']work_order_boqs["']\)\s*\.(update|insert|delete)/,
    );
  });

  it("panel keeps zero billing / payment / warranty / handover surfaces", () => {
    for (const term of BILLING_BANNED) {
      expect(PANEL).not.toContain(term);
    }
    expect(PANEL).not.toMatch(/from\(["']contracts["']\)\s*\.(update|insert|delete)/);
    expect(PANEL).not.toMatch(/from\(["']work_orders["']\)\s*\.(update|insert|delete)/);
    expect(PANEL).not.toMatch(/\bas any\b/);
    expect(PANEL).not.toMatch(/@ts-ignore/);
  });
});