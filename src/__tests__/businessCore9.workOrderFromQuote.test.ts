import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const SRC = join(process.cwd(), "src");
const SERVICE = join(SRC, "modules/workOrders/services/createWorkOrderFromQuote.ts");
const AUDIT = join(SRC, "modules/workOrders/services/recordWorkOrderAudit.ts");
const BUTTON = join(SRC, "components/workOrders/CreateWorkOrderFromQuoteButton.tsx");
const PROVIDER_LEAD_DETAIL = join(SRC, "pages/dashboard/ProviderLeadDetails.tsx");
const LEAD_DETAIL_SERVICE = join(SRC, "modules/leads/services/detail.ts");
const BARREL = join(SRC, "modules/workOrders/index.ts");

describe("BUSINESS-CORE-9: createWorkOrderFromQuote service", () => {
  const src = readFileSync(SERVICE, "utf8");

  it("delegates to createWorkOrder (no direct work_orders insert)", () => {
    expect(src).toMatch(/from\s+["']\.\.\/createWorkOrder["']/);
    expect(src).not.toMatch(/\.from\(["']work_orders["']\)/);
    expect(src).not.toMatch(/\.from\(["']work_order_stages["']\)/);
  });

  it("loads quote request through quote_request_leads (provider-safe)", () => {
    expect(src).toMatch(/quote_request_leads/);
    expect(src).toMatch(/quote_request:quote_requests/);
    expect(src).not.toMatch(/\.from\(["']quote_requests["']\)\.select/);
  });

  it("sets source_type='quote' and source_id=quote.id", () => {
    expect(src).toMatch(/source_type:\s*["']quote["']/);
    expect(src).toMatch(/source_id:\s*qr\.id/);
  });

  it("only persists source_ref_id when it matches the official ref pattern", () => {
    expect(src).toMatch(/\^\[A-Z\]\{2,6\}-\[A-Z0-9\]\+\$/);
    expect(src).toMatch(/source_ref_id:\s*sourceRefId/);
    expect(src).not.toMatch(/source_ref_id\s*=\s*quoteRequestId/);
    expect(src).not.toMatch(/source_ref_id\s*:\s*quoteRequestId/);
  });

  it("emits the work_order.created_from_quote audit event", () => {
    expect(src).toMatch(/recordWorkOrderAudit/);
    expect(src).toMatch(/work_order\.created_from_quote/);
  });

  it("returns { data, error } shape", () => {
    expect(src).toMatch(/data:\s*WorkOrderRow\s*\|\s*null;\s*error:\s*unknown/);
  });

  it("validates explicit businessId against quote_request_leads relationship", () => {
    expect(src).toMatch(/eq\(["']provider_id["'],\s*resolvedBusinessId\)/);
  });

  it("auto-resolves business_id when only one accessible lead exists", () => {
    expect(src).toMatch(/accessible\.length\s*===\s*1/);
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

describe("BUSINESS-CORE-9: audit action type extended", () => {
  it("declares the new action in RecordWorkOrderAuditInput", () => {
    const src = readFileSync(AUDIT, "utf8");
    expect(src).toMatch(/work_order\.created_from_quote/);
  });
});

describe("BUSINESS-CORE-9: UI button surface", () => {
  const btn = readFileSync(BUTTON, "utf8");

  it("uses the wrapper service (not direct table access)", () => {
    expect(btn).toMatch(/createWorkOrderFromQuote/);
    expect(btn).not.toMatch(/\.from\(["']work_orders["']\)/);
  });

  it("links to the WO-ref dashboard route on success", () => {
    expect(btn).toMatch(/\/dashboard\/work-orders\//);
  });

  it("uses inline form (no dialog/popup)", () => {
    expect(btn).not.toMatch(/from\s+["']@\/components\/ui\/dialog["']/);
    expect(btn).not.toMatch(/from\s+["']@\/components\/ui\/alert-dialog["']/);
  });

  it("does not display quote UUID as the source reference", () => {
    expect(btn).not.toMatch(/quoteRequestId\s*\}/);
  });
});

describe("BUSINESS-CORE-9: lead detail select extended for ref_id", () => {
  it("includes ref_id in ProviderLeadDetailRow quote_request type", () => {
    const src = readFileSync(LEAD_DETAIL_SERVICE, "utf8");
    expect(src).toMatch(/ref_id:\s*string\s*\|\s*null/);
    expect(src).toMatch(/id,\s*ref_id,\s*sector/);
  });
});

describe("BUSINESS-CORE-9: button mounted in provider lead detail", () => {
  it("renders CreateWorkOrderFromQuoteButton in ProviderLeadDetails", () => {
    const page = readFileSync(PROVIDER_LEAD_DETAIL, "utf8");
    expect(page).toMatch(/CreateWorkOrderFromQuoteButton/);
  });
});

describe("BUSINESS-CORE-9: barrel exports the new wrapper", () => {
  it("re-exports createWorkOrderFromQuote", () => {
    const src = readFileSync(BARREL, "utf8");
    expect(src).toMatch(/createWorkOrderFromQuote/);
  });
});
