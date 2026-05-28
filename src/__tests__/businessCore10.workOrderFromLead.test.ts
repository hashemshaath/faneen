import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const SRC = join(process.cwd(), "src");
const SERVICE = join(SRC, "modules/workOrders/services/createWorkOrderFromLead.ts");
const AUDIT = join(SRC, "modules/workOrders/services/recordWorkOrderAudit.ts");
const BUTTON = join(SRC, "components/workOrders/CreateWorkOrderFromLeadButton.tsx");
const LEAD_PANEL = join(SRC, "modules/leads/components/LeadDetailPanel.tsx");
const BARREL = join(SRC, "modules/workOrders/index.ts");

describe("BUSINESS-CORE-10: createWorkOrderFromLead service", () => {
  const src = readFileSync(SERVICE, "utf8");

  it("delegates to createWorkOrder (no direct work_orders insert)", () => {
    expect(src).toMatch(/from\s+["']\.\/createWorkOrder["']/);
    expect(src).not.toMatch(/\.from\(["']work_orders["']\)/);
    expect(src).not.toMatch(/\.from\(["']work_order_stages["']\)/);
  });

  it("loads the lead through lead_requests (RLS-gated, no service_role)", () => {
    expect(src).toMatch(/\.from\(["']lead_requests["']\)/);
    expect(src).not.toMatch(/service_role/i);
  });

  it("sets source_type='lead' and source_id=lead.id", () => {
    expect(src).toMatch(/source_type:\s*["']lead["']/);
    expect(src).toMatch(/source_id:\s*lead\.id/);
  });

  it("only persists source_ref_id when it matches the official ref pattern", () => {
    expect(src).toMatch(/\^\[A-Z\]\{2,6\}-\[A-Z0-9\]\+\$/);
    expect(src).toMatch(/source_ref_id:\s*sourceRefId/);
    expect(src).not.toMatch(/source_ref_id\s*:\s*leadRequestId/);
    expect(src).not.toMatch(/source_ref_id\s*:\s*lead\.id/);
  });

  it("emits the work_order.created_from_lead audit event", () => {
    expect(src).toMatch(/recordWorkOrderAudit/);
    expect(src).toMatch(/work_order\.created_from_lead/);
  });

  it("returns { data, error } shape", () => {
    expect(src).toMatch(/data:\s*WorkOrderRow\s*\|\s*null;\s*error:\s*unknown/);
  });

  it("rejects explicit businessId that mismatches the lead's business_id", () => {
    expect(src).toMatch(/business_id_mismatch/);
  });

  it("avoids automation/realtime/notifications/cron/payment/auth-flow imports", () => {
    expect(src).not.toMatch(/\bcron\b|scheduler/i);
    expect(src).not.toMatch(/\.channel\(/);
    expect(src).not.toMatch(/realtime/i);
    expect(src).not.toMatch(/notifications\//);
    expect(src).not.toMatch(/payments?\//i);
    expect(src).not.toMatch(/services\/auth\//);
  });
});

describe("BUSINESS-CORE-10: audit action type extended", () => {
  it("declares the new action in RecordWorkOrderAuditInput", () => {
    const src = readFileSync(AUDIT, "utf8");
    expect(src).toMatch(/work_order\.created_from_lead/);
  });
});

describe("BUSINESS-CORE-10: UI button surface", () => {
  const btn = readFileSync(BUTTON, "utf8");

  it("uses the wrapper service (not direct table access)", () => {
    expect(btn).toMatch(/createWorkOrderFromLead/);
    expect(btn).not.toMatch(/\.from\(["']work_orders["']\)/);
  });

  it("links to the WO-ref dashboard route on success", () => {
    expect(btn).toMatch(/\/dashboard\/work-orders\//);
  });

  it("uses inline form (no dialog/popup)", () => {
    expect(btn).not.toMatch(/from\s+["']@\/components\/ui\/dialog["']/);
    expect(btn).not.toMatch(/from\s+["']@\/components\/ui\/alert-dialog["']/);
  });

  it("does not display lead UUID as the source reference", () => {
    expect(btn).not.toMatch(/leadRequestId\s*\}/);
  });
});

describe("BUSINESS-CORE-10: button mounted in lead detail panel", () => {
  it("renders CreateWorkOrderFromLeadButton in LeadDetailPanel", () => {
    const page = readFileSync(LEAD_PANEL, "utf8");
    expect(page).toMatch(/CreateWorkOrderFromLeadButton/);
  });
});

describe("BUSINESS-CORE-10: barrel exports the new wrapper", () => {
  it("re-exports createWorkOrderFromLead", () => {
    const src = readFileSync(BARREL, "utf8");
    expect(src).toMatch(/createWorkOrderFromLead/);
  });
});