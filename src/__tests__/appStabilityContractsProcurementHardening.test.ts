/**
 * APP-STABILITY-CONTRACTS-PROCUREMENT-HARDENING-1
 *
 * Source-level guard tests that enforce the documented scope boundaries
 * of the current contract/quantity/measurement-driven baseline:
 *
 *   - No inventory module (BUSINESS-WORKFLOW-INVENTORY-1 still deferred).
 *   - No supplier payments module (BUSINESS-WORKFLOW-PROCUREMENT-PAYMENTS-1
 *     still deferred).
 *   - No public supplier portal route.
 *   - Public /q/:code remains the single dispatcher route.
 *   - Procurement award handoff never mutates inventory / payments /
 *     work-order stages directly.
 *
 * These are cheap static-source assertions — they fail loudly the moment
 * someone re-introduces scope that the deferred backlog explicitly excludes.
 */
import { describe, it, expect } from "vitest";
import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { resolve, join } from "node:path";

const ROOT = resolve(__dirname, "../..");
const read = (p: string) => readFileSync(resolve(ROOT, p), "utf-8");

function walk(dir: string, acc: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name === "dist" || name === ".git") continue;
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) walk(full, acc);
    else acc.push(full);
  }
  return acc;
}

describe("APP-STABILITY-CONTRACTS-PROCUREMENT-HARDENING-1 — scope boundaries", () => {
  describe("Inventory module remains deferred", () => {
    it("no src/modules/inventory directory exists", () => {
      expect(existsSync(resolve(ROOT, "src/modules/inventory"))).toBe(false);
    });

    it("no inventory-related tables are referenced from procurement services", () => {
      const procurementDir = resolve(ROOT, "src/modules/procurement/services");
      const files = walk(procurementDir).filter((f) => f.endsWith(".ts") && !f.includes("__tests__"));
      for (const f of files) {
        const src = readFileSync(f, "utf8");
        expect(src, `${f} references inventory tables`).not.toMatch(
          /\.from\(\s*['"](inventory_|stock_|warehouse_)/,
        );
      }
    });

    it("no /inventory routes in App.tsx", () => {
      const app = read("src/App.tsx");
      expect(app).not.toMatch(/path="\/inventory/);
      expect(app).not.toMatch(/path="\/dashboard\/inventory/);
    });
  });

  describe("Supplier payments remain deferred", () => {
    it("no supplier_payments table access anywhere in src/", () => {
      const files = walk(resolve(ROOT, "src")).filter(
        (f) => /\.(ts|tsx)$/.test(f) && !f.includes("__tests__") && !f.endsWith(".test.ts"),
      );
      for (const f of files) {
        const src = readFileSync(f, "utf8");
        expect(src, `${f} references supplier_payments`).not.toMatch(
          /\.from\(\s*['"](supplier_payments|procurement_supplier_payments)/,
        );
      }
    });

    it("no /supplier-payments route exists", () => {
      const app = read("src/App.tsx");
      expect(app).not.toMatch(/path="[^"]*supplier-payments?/);
    });
  });

  describe("Public supplier portal remains deferred", () => {
    it("no public supplier-portal route exists", () => {
      const app = read("src/App.tsx");
      expect(app).not.toMatch(/path="\/supplier(-portal)?\/?/);
      expect(app).not.toMatch(/path="\/portal\/supplier/);
    });

    it("no PublicSupplierPortal page file exists", () => {
      expect(existsSync(resolve(ROOT, "src/pages/PublicSupplierPortal.tsx"))).toBe(false);
      expect(existsSync(resolve(ROOT, "src/pages/SupplierPortal.tsx"))).toBe(false);
    });
  });

  describe("Procurement award handoff stays bounded", () => {
    const handoff = read("src/modules/procurement/services/awardHandoff.ts");

    it("does not touch work_order_stages, inventory, or payments tables", () => {
      // Allow narrative comments mentioning these names; forbid actual usage
      // (table reads/writes or RPC invocations).
      expect(handoff).not.toMatch(/\.from\(\s*['"]work_order_stages/);
      expect(handoff).not.toMatch(/\.from\(\s*['"](inventory_|stock_|warehouse_)/);
      expect(handoff).not.toMatch(/\.from\(\s*['"](supplier_payments|procurement_supplier_payments)/);
      expect(handoff).not.toMatch(/\.rpc\(\s*['"](inventory_|stock_|supplier_payment)/);
    });

    it("only routes through approved wrappers (addWorkOrderComment + notifyProcurementEvent)", () => {
      // No direct supabase.from(...) — must go through service wrappers.
      expect(handoff).not.toMatch(/supabase\.from\(/);
    });
  });

  describe("Public /q/:code dispatcher remains the only /q/* route", () => {
    it("App.tsx has exactly one /q/* path and it is /q/:code", () => {
      const app = read("src/App.tsx");
      const matches = app.match(/path="\/q\/[^"]+"/g) ?? [];
      expect(matches).toEqual(['path="/q/:code"']);
    });
  });
});