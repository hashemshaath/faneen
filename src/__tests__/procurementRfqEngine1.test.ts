/**
 * PROCUREMENT-RFQ-ENGINE-1 — Static-source guard tests.
 *
 * Verifies the BOQ → RFQ → PO-draft slice without booting Supabase. Mirrors
 * the cheap source-assertion style used by other hardening suites.
 */
import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = resolve(__dirname, "../..");
const read = (p: string) => readFileSync(resolve(ROOT, p), "utf-8");

describe("PROCUREMENT-RFQ-ENGINE-1 — scope and wiring guards", () => {
  it("createProcurementRfqFromBoq service exists and is exported", () => {
    const svc = read("src/modules/procurement/services/createRfqFromBoq.ts");
    expect(svc).toMatch(/export\s+async\s+function\s+createProcurementRfqFromBoq/);
    expect(svc).toMatch(/source_boq_id/);
    expect(svc).toMatch(/listBoqItems/);
    const barrel = read("src/modules/procurement/index.ts");
    expect(barrel).toMatch(/createProcurementRfqFromBoq/);
  });

  it("purchaseOrders service is wrapper-only and exported", () => {
    const svc = read("src/modules/procurement/services/purchaseOrders.ts");
    expect(svc).toMatch(/createPurchaseOrderDraft/);
    expect(svc).toMatch(/procurement_purchase_orders/);
    // No accounting / goods-receipt / inventory table access.
    expect(svc).not.toMatch(/\.from\(\s*['"](supplier_payments|goods_receipt|inventory_|stock_|warehouse_)/);
    const barrel = read("src/modules/procurement/index.ts");
    expect(barrel).toMatch(/createPurchaseOrderDraft/);
    expect(barrel).toMatch(/listPurchaseOrdersByRfq/);
  });

  it("awardRfqQuote wires the PO-draft helper after the RPC", () => {
    const rfqs = read("src/modules/procurement/services/rfqs.ts");
    expect(rfqs).toMatch(/createPurchaseOrderDraft/);
    expect(rfqs).toMatch(/procurement_award_quote/);
  });

  it("BOQ section has Create-RFQ-from-BOQ action wired through the wrapper", () => {
    const ui = read("src/components/workOrders/WorkOrderBoqSection.tsx");
    expect(ui).toMatch(/createProcurementRfqFromBoq/);
    expect(ui).toMatch(/wo-boq-create-rfq/);
    // No modal/dialog primitives in this section.
    expect(ui).not.toMatch(/<Dialog[\s>]/);
  });

  it("procurement detail page renders line-item matrix and PO-drafts panels", () => {
    const page = read("src/pages/dashboard/DashboardProcurementDetail.tsx");
    expect(page).toMatch(/proc-line-matrix-card/);
    expect(page).toMatch(/proc-po-drafts-card/);
    expect(page).toMatch(/listPurchaseOrdersByRfq/);
    expect(page).toMatch(/compareQuotesWithLineItems/);
    // No direct supabase.from in the page — all reads/writes via wrappers.
    expect(page).not.toMatch(/supabase\.from\(/);
  });

  it("deferred scope holds: no supplier portal, no PO PDF, no goods-receipt, no inventory", () => {
    expect(existsSync(resolve(ROOT, "src/pages/PublicSupplierPortal.tsx"))).toBe(false);
    expect(existsSync(resolve(ROOT, "src/pages/SupplierPortal.tsx"))).toBe(false);
    expect(existsSync(resolve(ROOT, "src/modules/inventory"))).toBe(false);
    const app = read("src/App.tsx");
    expect(app).not.toMatch(/path="\/supplier(-portal)?\/?/);
    expect(app).not.toMatch(/path="[^"]*goods-receipt/);
    // No supplier-payments / inventory routes either.
    expect(app).not.toMatch(/path="[^"]*supplier-payments?/);
    expect(app).not.toMatch(/path="\/dashboard\/inventory/);
  });

  it("isolation audit script tracks the new purchase-orders table", () => {
    const audit = read("scripts/procurement-isolation-audit.mjs");
    expect(audit).toMatch(/procurement_purchase_orders/);
  });
});