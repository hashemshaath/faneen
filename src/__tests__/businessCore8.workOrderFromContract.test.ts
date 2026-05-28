import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const SRC = join(process.cwd(), "src");
const SERVICE = join(SRC, "modules/workOrders/services/createWorkOrderFromContract.ts");
const AUDIT = join(SRC, "modules/workOrders/services/recordWorkOrderAudit.ts");
const BUTTON = join(SRC, "components/workOrders/CreateWorkOrderFromContractButton.tsx");
const CONTRACT_DETAIL = join(SRC, "pages/ContractDetail.tsx");
const BARREL = join(SRC, "modules/workOrders/index.ts");

describe("BUSINESS-CORE-8: createWorkOrderFromContract service", () => {
  const src = readFileSync(SERVICE, "utf8");

  it("delegates to createWorkOrder (no direct work_orders insert)", () => {
    expect(src).toMatch(/from\s+["']\.\/createWorkOrder["']/);
    expect(src).not.toMatch(/\.from\(["']work_orders["']\)/);
    expect(src).not.toMatch(/\.from\(["']work_order_stages["']\)/);
  });

  it("reads the contract through the contracts module wrapper", () => {
    expect(src).toMatch(/getContractById/);
    expect(src).not.toMatch(/\.from\(["']contracts["']\)/);
  });

  it("sets source_type='contract' and source_id=contract.id", () => {
    expect(src).toMatch(/source_type:\s*["']contract["']/);
    expect(src).toMatch(/source_id:\s*contract\.id/);
  });

  it("only persists source_ref_id when it matches the official ref pattern", () => {
    expect(src).toMatch(/\^\[A-Z\]\{2,6\}-\[A-Z0-9\]\+\$/);
    expect(src).toMatch(/source_ref_id:\s*sourceRefId/);
    expect(src).not.toMatch(/source_ref_id\s*=\s*contract\.id/);
    expect(src).not.toMatch(/source_ref_id\s*:\s*contract\.id/);
  });

  it("emits the work_order.created_from_contract audit event", () => {
    expect(src).toMatch(/recordWorkOrderAudit/);
    expect(src).toMatch(/work_order\.created_from_contract/);
  });

  it("returns { data, error } shape", () => {
    expect(src).toMatch(/data:\s*WorkOrderRow\s*\|\s*null;\s*error:\s*unknown/);
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

describe("BUSINESS-CORE-8: audit action type extended", () => {
  it("declares the new action in RecordWorkOrderAuditInput", () => {
    const src = readFileSync(AUDIT, "utf8");
    expect(src).toMatch(/work_order\.created_from_contract/);
  });
});

describe("BUSINESS-CORE-8: UI button surface", () => {
  const btn = readFileSync(BUTTON, "utf8");

  it("uses the wrapper service (not direct table access)", () => {
    expect(btn).toMatch(/createWorkOrderFromContract/);
    expect(btn).not.toMatch(/\.from\(["']work_orders["']\)/);
  });

  it("links to the WO-ref dashboard route on success", () => {
    expect(btn).toMatch(/\/dashboard\/work-orders\//);
  });

  it("uses inline form (no dialog/popup)", () => {
    expect(btn).not.toMatch(/from\s+["']@\/components\/ui\/dialog["']/);
    expect(btn).not.toMatch(/from\s+["']@\/components\/ui\/alert-dialog["']/);
  });

  it("is mounted in ContractDetail", () => {
    const cd = readFileSync(CONTRACT_DETAIL, "utf8");
    expect(cd).toMatch(/CreateWorkOrderFromContractButton/);
  });

  it("does not display contract UUID as the source reference", () => {
    expect(btn).not.toMatch(/contract\.id\s*\}/);
  });
});

describe("BUSINESS-CORE-8: barrel exports the new wrapper", () => {
  it("re-exports createWorkOrderFromContract", () => {
    const src = readFileSync(BARREL, "utf8");
    expect(src).toMatch(/createWorkOrderFromContract/);
  });
});
