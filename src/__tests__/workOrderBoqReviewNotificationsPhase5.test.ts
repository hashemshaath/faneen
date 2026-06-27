/**
 * WORK ORDER BOQ REVIEW NOTIFICATIONS + TIMELINE — PHASE 5 acceptance suite.
 *
 * - Pure FSM tests over the recipient resolver (no I/O).
 * - Static guards on the notification helper, timeline service, timeline
 *   component, and transition service — ensuring billing/lifecycle/RLS
 *   surfaces are NOT introduced and that components never write directly.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  resolveWorkOrderBoqReviewRecipients,
  type WorkOrderBoqReviewNotificationContext,
} from "@/modules/workOrders/services/notifications/notifyWorkOrderBoqReview";

const ROOT = process.cwd();
const read = (p: string) => readFileSync(join(ROOT, p), "utf8");

const NOTIFY = read(
  "src/modules/workOrders/services/notifications/notifyWorkOrderBoqReview.ts",
);
const TIMELINE = read(
  "src/modules/workOrders/services/listWorkOrderBoqReviewTimeline.ts",
);
const TIMELINE_UI = read(
  "src/components/workOrders/WorkOrderBoqReviewTimeline.tsx",
);
const TRANSITION = read(
  "src/modules/workOrders/services/transitionWorkOrderBoqReview.ts",
);
const WRAPPER = read(
  "src/components/workOrders/WorkOrderMeasurementsAndBoqSection.tsx",
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

const ctx = (
  overrides: Partial<WorkOrderBoqReviewNotificationContext> = {},
): WorkOrderBoqReviewNotificationContext => ({
  work_order_id: "wo-1",
  boq_id: "boq-1",
  provider_user_id: "provider-1",
  client_user_id: "client-1",
  actor_user_id: "provider-1",
  ...overrides,
});

describe("WORK ORDER BOQ REVIEW NOTIFICATIONS — Phase 5 (recipients)", () => {
  it("submit → notifies the client only", () => {
    expect(
      resolveWorkOrderBoqReviewRecipients(ctx(), "boq_review_submitted"),
    ).toEqual(["client-1"]);
  });

  it("resubmit → notifies the client only", () => {
    expect(
      resolveWorkOrderBoqReviewRecipients(ctx(), "boq_review_resubmitted"),
    ).toEqual(["client-1"]);
  });

  it("changes requested → notifies the provider only", () => {
    expect(
      resolveWorkOrderBoqReviewRecipients(
        ctx({ actor_user_id: "client-1" }),
        "boq_review_changes_requested",
      ),
    ).toEqual(["provider-1"]);
  });

  it("accepted → notifies the provider only", () => {
    expect(
      resolveWorkOrderBoqReviewRecipients(
        ctx({ actor_user_id: "client-1" }),
        "boq_review_accepted",
      ),
    ).toEqual(["provider-1"]);
  });

  it("excludes the actor even if they match a party id", () => {
    expect(
      resolveWorkOrderBoqReviewRecipients(
        ctx({ actor_user_id: "client-1" }),
        "boq_review_submitted",
      ),
    ).toEqual([]);
  });

  it("returns no recipients when the target party id is missing", () => {
    expect(
      resolveWorkOrderBoqReviewRecipients(
        ctx({ client_user_id: null }),
        "boq_review_submitted",
      ),
    ).toEqual([]);
    expect(
      resolveWorkOrderBoqReviewRecipients(
        ctx({ provider_user_id: null, actor_user_id: "client-1" }),
        "boq_review_accepted",
      ),
    ).toEqual([]);
  });
});

describe("WORK ORDER BOQ REVIEW NOTIFICATIONS — Phase 5 (notify guards)", () => {
  it("uses the central createNotification wrapper", () => {
    expect(NOTIFY).toContain("createNotification");
    expect(NOTIFY).toContain('notification_type: "work_order"');
    expect(NOTIFY).toMatch(/reference_type: "work_order_boq"/);
  });

  it("links the notification to the work order detail page", () => {
    expect(NOTIFY).toContain("/dashboard/work-orders/");
  });

  it("has no billing / payment / warranty / handover / lifecycle surfaces", () => {
    for (const term of BILLING_BANNED) {
      expect(NOTIFY).not.toContain(term);
    }
    expect(NOTIFY).not.toContain("service_role");
    expect(NOTIFY).not.toMatch(/\bas any\b/);
    expect(NOTIFY).not.toMatch(/@ts-ignore/);
  });

  it("does not write to contracts or work_orders tables", () => {
    expect(NOTIFY).not.toMatch(
      /from\(["']contracts["']\)\s*\.(update|insert|delete)/,
    );
    expect(NOTIFY).not.toMatch(
      /from\(["']work_orders["']\)\s*\.(update|insert|delete)/,
    );
    expect(NOTIFY).not.toMatch(
      /from\(["']work_order_boqs["']\)\s*\.(update|insert|delete)/,
    );
  });
});

describe("WORK ORDER BOQ REVIEW NOTIFICATIONS — Phase 5 (transition wiring)", () => {
  it("transition service dispatches notifyWorkOrderBoqReview after audit", () => {
    expect(TRANSITION).toContain("notifyWorkOrderBoqReview");
    expect(TRANSITION).toContain("resolveWorkOrderContractParties");
    expect(TRANSITION).toMatch(/resolveNotificationEvent/);
  });

  it("transition still routes through the FSM guard and audit", () => {
    expect(TRANSITION).toContain("isAllowedBoqReviewTransition");
    expect(TRANSITION).toContain("recordWorkOrderAudit");
  });

  it("transition keeps zero billing / lifecycle surfaces", () => {
    for (const term of BILLING_BANNED) {
      expect(TRANSITION).not.toContain(term);
    }
    expect(TRANSITION).not.toContain("service_role");
  });
});

describe("WORK ORDER BOQ REVIEW TIMELINE — Phase 5", () => {
  it("service reads business_audit_log filtered to BOQ review actions", () => {
    expect(TIMELINE).toContain('from("business_audit_log")');
    expect(TIMELINE).toContain("work_order.boq_review_submitted");
    expect(TIMELINE).toContain("work_order.boq_review_changes_requested");
    expect(TIMELINE).toContain("work_order.boq_review_accepted");
    expect(TIMELINE).not.toContain("service_role");
    expect(TIMELINE).not.toMatch(/\bas any\b/);
  });

  it("timeline UI is read-only and mounted by the WO BOQ wrapper", () => {
    expect(TIMELINE_UI).toContain("listWorkOrderBoqReviewTimeline");
    expect(TIMELINE_UI).toContain("wo-boq-review-timeline");
    expect(TIMELINE_UI).not.toMatch(/supabase\s*\.from\(/);
    expect(WRAPPER).toContain("WorkOrderBoqReviewTimeline");
  });

  it("timeline UI keeps zero billing / lifecycle surfaces", () => {
    for (const term of BILLING_BANNED) {
      expect(TIMELINE_UI).not.toContain(term);
    }
    expect(TIMELINE_UI).not.toContain("service_role");
    expect(TIMELINE_UI).not.toMatch(/\bas any\b/);
    expect(TIMELINE_UI).not.toMatch(/@ts-ignore/);
  });
});