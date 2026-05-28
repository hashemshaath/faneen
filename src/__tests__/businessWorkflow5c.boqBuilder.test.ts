/**
 * BUSINESS-WORKFLOW-5C — Bill of Quantities (BOQ) from measurements.
 * Runtime tests for the pure generator + totals helper, plus source-level
 * invariants for the migration, services, UI, and security posture.
 */
import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import {
  generateBoqItemsFromMeasurements,
  computeBoqTotals,
  BOQ_SECTOR_KEYS,
  BOQ_VAT_RATE,
  WORK_ORDER_BOQ_ITEM_TYPES,
  type WorkOrderMeasurementRow,
  type WorkOrderMeasurementUnit,
} from "@/modules/workOrders";

const ROOT = process.cwd();
const MIGRATIONS = join(ROOT, "supabase/migrations");
const read = (rel: string) => readFileSync(join(ROOT, rel), "utf8");

function findMigration(needle: string): string | null {
  if (!existsSync(MIGRATIONS)) return null;
  for (const f of readdirSync(MIGRATIONS).filter((x) => x.endsWith(".sql"))) {
    const src = readFileSync(join(MIGRATIONS, f), "utf8");
    if (src.includes(needle)) return src;
  }
  return null;
}

function makeMeasurement(over: Partial<WorkOrderMeasurementRow> = {}): WorkOrderMeasurementRow {
  return {
    id: over.id ?? "00000000-0000-0000-0000-000000000001",
    ref_id: "WOM-1001",
    work_order_id: "wo-1",
    task_id: null,
    business_id: "biz-1",
    recorded_by_user_id: "user-1",
    measurement_type: "custom",
    label: "Item",
    width: null,
    height: null,
    depth: null,
    length: null,
    quantity: 1,
    unit: "cm" as WorkOrderMeasurementUnit,
    notes: null,
    metadata: {},
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    deleted_at: null,
    ...over,
  };
}

/* ─────────── Migration / schema / RLS ─────────── */
describe("BUSINESS-WORKFLOW-5C migration", () => {
  const sql = findMigration("public.work_order_boqs");

  it("creates the BOQ header + items tables", () => {
    expect(sql).not.toBeNull();
    expect(sql!).toMatch(/CREATE TABLE public\.work_order_boqs/);
    expect(sql!).toMatch(/CREATE TABLE public\.work_order_boq_items/);
  });

  it("ref prefixes BOQ- and BOQI- wired via sequence + trigger", () => {
    expect(sql!).toMatch(/work_order_boqs_ref_seq/);
    expect(sql!).toMatch(/work_order_boq_items_ref_seq/);
    expect(sql!).toMatch(/'BOQ-' \|\| nextval/);
    expect(sql!).toMatch(/'BOQI-' \|\| nextval/);
  });

  it("status + item_type CHECK constraints exist", () => {
    expect(sql!).toMatch(/status[^;]*CHECK \(status IN \('draft','finalized'\)\)/);
    expect(sql!).toMatch(/item_type[^;]*CHECK \(item_type IN \('material','labor','service','fabrication'\)\)/);
  });

  it("non-negative numeric constraints enforced", () => {
    expect(sql!).toMatch(/CHECK \(subtotal >= 0\)/);
    expect(sql!).toMatch(/CHECK \(tax >= 0\)/);
    expect(sql!).toMatch(/CHECK \(total >= 0\)/);
    expect(sql!).toMatch(/CHECK \(quantity >= 0\)/);
    expect(sql!).toMatch(/CHECK \(unit_price >= 0\)/);
    expect(sql!).toMatch(/CHECK \(total_price >= 0\)/);
  });

  it("RLS enabled, no anon grant, member read / manager write", () => {
    expect(sql!).toMatch(/ALTER TABLE public\.work_order_boqs ENABLE ROW LEVEL SECURITY/);
    expect(sql!).toMatch(/ALTER TABLE public\.work_order_boq_items ENABLE ROW LEVEL SECURITY/);
    expect(sql!).not.toMatch(/GRANT[^;]*ON public\.work_order_boqs?[_a-z]*[^;]*TO anon/i);
    expect(sql!).toMatch(/CREATE POLICY "wo_boqs_select_member"/);
    expect(sql!).toMatch(/CREATE POLICY "wo_boqs_insert_manager"/);
    expect(sql!).toMatch(/CREATE POLICY "wo_boqi_select_member"/);
    expect(sql!).toMatch(/CREATE POLICY "wo_boqi_insert_manager_draft"/);
  });

  it("finalized BOQ is locked at the trigger level", () => {
    expect(sql!).toMatch(/boq_finalized_locked/);
  });

  it("items use ON DELETE SET NULL for measurement_id (non-destructive)", () => {
    expect(sql!).toMatch(/measurement_id[\s\S]*REFERENCES public\.work_order_measurements\(id\) ON DELETE SET NULL/);
  });

  it("does NOT alter the existing work_order_measurements table", () => {
    expect(sql!).not.toMatch(/ALTER TABLE\s+public\.work_order_measurements/i);
    expect(sql!).not.toMatch(/DROP TABLE\s+public\.work_order_measurements/i);
  });
});

/* ─────────── Pure generator ─────────── */
describe("generateBoqItemsFromMeasurements", () => {
  it("kitchen: panel sqm + countertop lm", () => {
    const m = makeMeasurement({
      label: "Cabinet A",
      width: 200,
      height: 100,
      length: 300,
      unit: "cm",
      quantity: 2,
    });
    const items = generateBoqItemsFromMeasurements({ sectorKey: "kitchen", measurements: [m] });
    expect(items).toHaveLength(2);
    const panel = items[0];
    expect(panel.unit).toBe("m2");
    // 2m * 1m * 2qty = 4
    expect(panel.quantity).toBeCloseTo(4, 2);
    const counter = items[1];
    expect(counter.unit).toBe("lm");
    expect(counter.quantity).toBeCloseTo(6, 2); // 3m * 2qty
  });

  it("aluminum window: glass sqm + frame perimeter lm", () => {
    const m = makeMeasurement({
      label: "Window 1",
      width: 1500,
      height: 1000,
      unit: "mm",
      quantity: 1,
    });
    const items = generateBoqItemsFromMeasurements({ sectorKey: "aluminum", measurements: [m] });
    expect(items).toHaveLength(2);
    expect(items[0].unit).toBe("m2");
    expect(items[0].quantity).toBeCloseTo(1.5, 2);
    expect(items[1].unit).toBe("lm");
    expect(items[1].quantity).toBeCloseTo(5, 2); // 2*(1.5+1)
  });

  it("steel: length × quantity as fabrication lm", () => {
    const m = makeMeasurement({
      label: "Beam",
      length: 6,
      unit: "m",
      quantity: 4,
    });
    const items = generateBoqItemsFromMeasurements({ sectorKey: "steel", measurements: [m] });
    expect(items).toHaveLength(1);
    expect(items[0].item_type).toBe("fabrication");
    expect(items[0].quantity).toBeCloseTo(24, 2);
    expect(items[0].unit).toBe("lm");
  });

  it("glass: carries thickness metadata when present", () => {
    const m = makeMeasurement({
      label: "Glass panel",
      width: 100,
      height: 200,
      unit: "cm",
      metadata: { glass_thickness: 10 },
    });
    const items = generateBoqItemsFromMeasurements({ sectorKey: "glass", measurements: [m] });
    expect(items).toHaveLength(1);
    expect(items[0].metadata.thickness_mm).toBe(10);
    expect(items[0].quantity).toBeCloseTo(2, 2);
  });

  it("quantity guards: negative values are coerced safely, never NaN", () => {
    const m = makeMeasurement({ width: -5, height: 100, length: NaN as unknown as number, quantity: -2 });
    const items = generateBoqItemsFromMeasurements({ sectorKey: "general", measurements: [m] });
    expect(items.length).toBeGreaterThan(0);
    for (const it of items) {
      expect(Number.isFinite(it.quantity)).toBe(true);
      expect(it.quantity).toBeGreaterThanOrEqual(0);
      expect(Number.isFinite(it.unit_price)).toBe(true);
      expect(it.unit_price).toBe(0); // no pricing logic in 5C
    }
  });

  it("does NOT mutate the source measurements (defensive copy)", () => {
    const m = makeMeasurement({
      label: "Glass",
      width: 100,
      height: 100,
      unit: "cm",
      metadata: { glass_thickness: 8, sticky: true },
    });
    const snapshot = JSON.stringify(m);
    generateBoqItemsFromMeasurements({ sectorKey: "glass", measurements: [m] });
    expect(JSON.stringify(m)).toBe(snapshot);
  });

  it("unknown sector falls back to a generic material line", () => {
    const m = makeMeasurement({ label: "Custom", width: 100, height: 100, unit: "cm" });
    const items = generateBoqItemsFromMeasurements({ sectorKey: "made-up-sector", measurements: [m] });
    expect(items.length).toBeGreaterThan(0);
    expect(items[0].item_type).toBe("material");
  });

  it("always emits at least one row per measurement", () => {
    const m = makeMeasurement({ label: "Empty", quantity: 1 });
    const items = generateBoqItemsFromMeasurements({ sectorKey: "kitchen", measurements: [m] });
    expect(items.length).toBeGreaterThan(0);
  });

  it("sector + item_type allow-lists are sealed", () => {
    expect(BOQ_SECTOR_KEYS).toEqual([
      "kitchen", "aluminum", "glass", "steel", "wood", "facade", "fabrication", "general",
    ]);
    expect(WORK_ORDER_BOQ_ITEM_TYPES).toEqual([
      "material", "labor", "service", "fabrication",
    ]);
  });
});

/* ─────────── Totals helper ─────────── */
describe("computeBoqTotals", () => {
  it("computes subtotal/tax/total with 15% VAT", () => {
    const totals = computeBoqTotals([
      { quantity: 2, unit_price: 100 },
      { quantity: 1, unit_price: 50 },
    ]);
    expect(totals.subtotal).toBe(250);
    expect(totals.tax).toBe(37.5);
    expect(totals.total).toBe(287.5);
    expect(BOQ_VAT_RATE).toBe(0.15);
  });

  it("ignores negative or NaN entries", () => {
    const totals = computeBoqTotals([
      { quantity: -5, unit_price: 100 },
      { quantity: 2, unit_price: NaN as unknown as number },
      { quantity: 3, unit_price: 10 },
    ]);
    expect(totals.subtotal).toBe(30);
  });

  it("zero items -> zero totals", () => {
    expect(computeBoqTotals([])).toEqual({ subtotal: 0, tax: 0, total: 0 });
  });
});

/* ─────────── Service / source-level invariants ─────────── */
describe("BUSINESS-WORKFLOW-5C services source", () => {
  const files = [
    "src/modules/workOrders/services/createBoqFromMeasurements.ts",
    "src/modules/workOrders/services/listWorkOrderBoqs.ts",
    "src/modules/workOrders/services/listBoqItems.ts",
    "src/modules/workOrders/services/updateBoqItemPricing.ts",
    "src/modules/workOrders/services/recomputeBoqTotals.ts",
    "src/modules/workOrders/services/finalizeBoq.ts",
    "src/modules/workOrders/services/generateBoqItemsFromMeasurements.ts",
  ];

  it("all service files exist and are exported via barrel", () => {
    const barrel = read("src/modules/workOrders/index.ts");
    for (const f of files) {
      expect(existsSync(join(ROOT, f)), f).toBe(true);
    }
    expect(barrel).toMatch(/generateBoqItemsFromMeasurements/);
    expect(barrel).toMatch(/createBoqFromMeasurements/);
    expect(barrel).toMatch(/listWorkOrderBoqs/);
    expect(barrel).toMatch(/listBoqItems/);
    expect(barrel).toMatch(/updateBoqItemPricing/);
    expect(barrel).toMatch(/finalizeBoq/);
  });

  it("services touch ONLY the BOQ + measurement tables (no payments/contracts/invoices/auth)", () => {
    const forbidden = [
      /from\(['"]payments['"]\)/,
      /from\(['"]invoices['"]\)/,
      /from\(['"]contracts['"]\)/,
      /from\(['"]contract_payments['"]\)/,
      /from\(['"]quotes['"]\)/,
      /from\(['"]profiles['"]\)/,
      /from\(['"]user_roles['"]\)/,
      /from\(['"]notifications['"]\)/,
    ];
    for (const f of files) {
      const src = read(f);
      for (const r of forbidden) expect(src, f).not.toMatch(r);
    }
  });

  it("services do NOT wire realtime, edge functions, or external notifications", () => {
    for (const f of files) {
      const src = read(f);
      expect(src, f).not.toMatch(/supabase\.channel\(/);
      expect(src, f).not.toMatch(/postgres_changes/);
      expect(src, f).not.toMatch(/functions\.invoke\(/);
      expect(src, f).not.toMatch(/fetch\(['"]https?:/);
    }
  });

  it("generator never imports the supabase client (pure helper)", () => {
    const src = read("src/modules/workOrders/services/generateBoqItemsFromMeasurements.ts");
    expect(src).not.toMatch(/from ['"]@\/integrations\/supabase/);
  });
});

/* ─────────── UI invariants ─────────── */
describe("WorkOrderBoqSection UI", () => {
  const src = read("src/components/workOrders/WorkOrderBoqSection.tsx");

  it("renders the section with the right ARIA label keys (AR/EN)", () => {
    expect(src).toMatch(/جدول الكميات/);
    expect(src).toMatch(/Bill of Quantities/);
    expect(src).toMatch(/data-testid="wo-boq-section"/);
    expect(src).toMatch(/data-testid="wo-boq-items-table"/);
    expect(src).toMatch(/data-testid="wo-boq-subtotal"/);
    expect(src).toMatch(/data-testid="wo-boq-total"/);
  });

  it("uses inline forms, NEVER modal / dialog primitives", () => {
    expect(src).not.toMatch(/from ['"]@\/components\/ui\/dialog['"]/);
    expect(src).not.toMatch(/from ['"]@\/components\/ui\/alert-dialog['"]/);
    expect(src).not.toMatch(/<Dialog[\s>]/);
    expect(src).not.toMatch(/<AlertDialog[\s>]/);
  });

  it("uses module services — no direct supabase.from in the component", () => {
    expect(src).not.toMatch(/from ['"]@\/integrations\/supabase\/client['"]/);
    expect(src).not.toMatch(/supabase\.from\(/);
  });

  it("exposes both the finalize action and the generate action", () => {
    expect(src).toMatch(/finalizeBoq/);
    expect(src).toMatch(/createBoqFromMeasurements/);
    expect(src).toMatch(/onFinalize/);
  });

  it("BOQ section is wired into the dashboard work-order detail page", () => {
    const page = read("src/pages/dashboard/DashboardWorkOrderDetail.tsx");
    expect(page).toMatch(/WorkOrderBoqSection/);
  });
});

/* ─────────── Security posture ─────────── */
describe("BUSINESS-WORKFLOW-5C security posture", () => {
  it("no signed-URL or raw file path leakage in BOQ services", () => {
    const dir = "src/modules/workOrders/services";
    for (const f of readdirSync(join(ROOT, dir))) {
      if (!/Boq|boq/.test(f)) continue;
      const src = read(`${dir}/${f}`);
      expect(src, f).not.toMatch(/createSignedUrl/);
      expect(src, f).not.toMatch(/getPublicUrl/);
    }
  });

  it("BOQ tables referenced only via module services + supabase types", () => {
    const offenders: string[] = [];
    const walk = (dir: string) => {
      for (const entry of readdirSync(join(ROOT, dir), { withFileTypes: true })) {
        const rel = `${dir}/${entry.name}`;
        if (entry.isDirectory()) {
          if (entry.name === "__tests__" || entry.name === "node_modules") continue;
          walk(rel);
        } else if (/\.(ts|tsx)$/.test(entry.name) && !/\.test\.(ts|tsx)$/.test(entry.name)) {
          const code = readFileSync(join(ROOT, rel), "utf8");
          if (
            /from\(['"]work_order_boqs['"]\)/.test(code) ||
            /from\(['"]work_order_boq_items['"]\)/.test(code)
          ) {
            offenders.push(rel);
          }
        }
      }
    };
    walk("src");
    const allowed = new Set([
      "src/modules/workOrders/services/createBoqFromMeasurements.ts",
      "src/modules/workOrders/services/listWorkOrderBoqs.ts",
      "src/modules/workOrders/services/listBoqItems.ts",
      "src/modules/workOrders/services/updateBoqItemPricing.ts",
      "src/modules/workOrders/services/recomputeBoqTotals.ts",
      "src/modules/workOrders/services/finalizeBoq.ts",
    ]);
    const unexpected = offenders.filter((p) => !allowed.has(p));
    expect(unexpected).toEqual([]);
  });
});