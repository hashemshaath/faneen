/**
 * BUSINESS-WORKFLOW-5B — Measurement templates by sector.
 * Runtime tests for the pure builder + source-level invariants for the
 * migration, services, UI, and security posture.
 */
import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import {
  buildMeasurementFromTemplate,
  WORK_ORDER_MEASUREMENT_TEMPLATE_FIELD_TYPES,
  type WorkOrderMeasurementTemplateRow,
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

const baseTemplate = (overrides: Partial<WorkOrderMeasurementTemplateRow> = {}): WorkOrderMeasurementTemplateRow => ({
  id: "00000000-0000-0000-0000-000000000001",
  ref_id: "WMT-1000",
  sector_key: "aluminum",
  template_key: "window_basic",
  title_ar: "نافذة",
  title_en: "Window basic",
  description_ar: null,
  description_en: null,
  default_measurement_type: "window",
  default_unit: "cm",
  is_active: true,
  sort_order: 0,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  fields: [
    { key: "width", label_ar: "العرض", label_en: "Width", type: "number", unit: "cm", required: true, maps_to: "width" },
    { key: "height", label_ar: "الارتفاع", label_en: "Height", type: "number", unit: "cm", required: true, maps_to: "height" },
    { key: "quantity", label_ar: "الكمية", label_en: "Quantity", type: "number", required: true, maps_to: "quantity" },
    { key: "glass_thickness", label_ar: "سماكة الزجاج", label_en: "Glass thickness", type: "number", unit: "mm" },
    { key: "installation_side", label_ar: "جهة التركيب", label_en: "Side", type: "select", options: [
      { value: "inside", label_ar: "داخلي", label_en: "Inside" },
      { value: "outside", label_ar: "خارجي", label_en: "Outside" },
    ] },
  ],
  ...overrides,
});

/* ─────────── Migration / schema / RLS ─────────── */
describe("BUSINESS-WORKFLOW-5B migration", () => {
  const sql = findMigration("public.work_order_measurement_templates");

  it("creates the templates table", () => {
    expect(sql).not.toBeNull();
    expect(sql!).toMatch(/CREATE TABLE\s+public\.work_order_measurement_templates/);
  });

  it("WMT- ref prefix wired via sequence + trigger", () => {
    expect(sql!).toMatch(/work_order_measurement_templates_ref_seq/);
    expect(sql!).toMatch(/'WMT-' \|\| nextval/);
  });

  it("RLS enabled, no anon grant, authenticated read only", () => {
    expect(sql!).toMatch(/ALTER TABLE public\.work_order_measurement_templates ENABLE ROW LEVEL SECURITY/);
    expect(sql!).not.toMatch(/GRANT[^;]*ON public\.work_order_measurement_templates[^;]*TO anon/i);
    expect(sql!).toMatch(/GRANT SELECT ON public\.work_order_measurement_templates TO authenticated/);
    expect(sql!).toMatch(/GRANT ALL ON public\.work_order_measurement_templates TO service_role/);
    expect(sql!).toMatch(/CREATE POLICY "womt_select_authenticated"/);
    expect(sql!).not.toMatch(/CREATE POLICY[^;]+work_order_measurement_templates\s+FOR\s+(INSERT|UPDATE|DELETE)/i);
  });

  it("unit + field array shape enforced via CHECK", () => {
    expect(sql!).toMatch(/default_unit[\s\S]+CHECK \(default_unit IN \('mm','cm','m','inch'\)\)/);
    expect(sql!).toMatch(/CHECK \(jsonb_typeof\(fields\) = 'array'\)/);
  });

  it("seeds all default templates", () => {
    const keys = [
      "kitchen_basic", "window_basic", "door_basic",
      "glass_panel", "steel_frame", "facade_panel", "custom_general",
    ];
    for (const k of keys) expect(sql!).toContain(`'${k}'`);
  });

  it("does NOT destructively alter work_order_measurements", () => {
    expect(sql!).not.toMatch(/DROP\s+(TABLE|COLUMN)[\s\S]*work_order_measurements/i);
    expect(sql!).not.toMatch(/ALTER\s+TABLE\s+public\.work_order_measurements/i);
  });
});

/* ─────────── Pure builder ─────────── */
describe("buildMeasurementFromTemplate", () => {
  it("maps standard keys to columns and others to metadata", () => {
    const r = buildMeasurementFromTemplate({
      template: baseTemplate(),
      values: { width: 120, height: 80, quantity: 3, glass_thickness: 6, installation_side: "inside" },
    });
    expect(r.ok).toBe(true);
    expect(r.draft!.width).toBe(120);
    expect(r.draft!.height).toBe(80);
    expect(r.draft!.quantity).toBe(3);
    expect(r.draft!.metadata.glass_thickness).toBe(6);
    expect(r.draft!.metadata.installation_side).toBe("inside");
    expect(r.draft!.metadata.template_key).toBe("window_basic");
    expect(r.draft!.measurement_type).toBe("window");
    expect(r.draft!.unit).toBe("cm");
  });

  it("flags missing required fields", () => {
    const r = buildMeasurementFromTemplate({
      template: baseTemplate(),
      values: { width: 100 },
    });
    expect(r.ok).toBe(false);
    expect(r.errors.some((e) => e.code === "required_missing" && e.fieldKey === "height")).toBe(true);
    expect(r.errors.some((e) => e.code === "required_missing" && e.fieldKey === "quantity")).toBe(true);
    expect(r.draft).toBeNull();
  });

  it("rejects negative numbers", () => {
    const r = buildMeasurementFromTemplate({
      template: baseTemplate(),
      values: { width: -5, height: 80, quantity: 1 },
    });
    expect(r.ok).toBe(false);
    expect(r.errors[0].code).toBe("negative_number");
    expect(r.errors[0].fieldKey).toBe("width");
  });

  it("rejects invalid select values", () => {
    const r = buildMeasurementFromTemplate({
      template: baseTemplate(),
      values: { width: 1, height: 1, quantity: 1, installation_side: "nope" },
    });
    expect(r.ok).toBe(false);
    expect(r.errors[0].code).toBe("invalid_select");
  });

  it("uses template title when no label override", () => {
    const r = buildMeasurementFromTemplate({
      template: baseTemplate(),
      values: { width: 1, height: 1, quantity: 1 },
    });
    expect(r.draft!.label).toBe("Window basic");
  });

  it("honors a 'label' text field as label override", () => {
    const r = buildMeasurementFromTemplate({
      template: baseTemplate({
        fields: [
          { key: "label", label_ar: "الوصف", label_en: "Label", type: "text", required: true },
          { key: "width", label_ar: "العرض", label_en: "Width", type: "number", maps_to: "width" },
        ],
      }),
      values: { label: "Front bay window", width: 200 },
    });
    expect(r.ok).toBe(true);
    expect(r.draft!.label).toBe("Front bay window");
  });

  it("field type allow-list is sealed", () => {
    expect([...WORK_ORDER_MEASUREMENT_TEMPLATE_FIELD_TYPES].sort()).toEqual(
      ["boolean", "number", "select", "text"],
    );
  });
});

/* ─────────── Service source invariants ─────────── */
describe("template services source", () => {
  const list = read("src/modules/workOrders/services/listMeasurementTemplates.ts");
  const get = read("src/modules/workOrders/services/getMeasurementTemplateByKey.ts");
  const orch = read("src/modules/workOrders/services/createMeasurementsFromTemplate.ts");

  it("services read only the templates table", () => {
    for (const src of [list, get]) {
      expect(src).toMatch(/work_order_measurement_templates/);
      expect(src).not.toMatch(/\.insert\(/);
      expect(src).not.toMatch(/\.update\(/);
      expect(src).not.toMatch(/\.delete\(/);
    }
  });

  it("orchestrator routes through insertWorkOrderMeasurement (manual flow shared)", () => {
    expect(orch).toMatch(/insertWorkOrderMeasurement/);
    expect(orch).not.toMatch(/from\(['"]work_order_measurements['"]\)/);
  });

  it("orchestrator does NOT touch payment / auth / contract / quote tables", () => {
    for (const t of ["contracts", "quotes", "payments", "auth.users", "memberships"]) {
      expect(orch, t).not.toMatch(new RegExp(`\\b${t.replace(".", "\\.")}\\b`));
    }
  });
});

/* ─────────── UI invariants ─────────── */
describe("WorkOrderMeasurementsSection UI", () => {
  const ui = read("src/components/workOrders/WorkOrderMeasurementsSection.tsx");

  it("exposes both manual add and use-template entries", () => {
    expect(ui).toMatch(/إضافة قياس/);
    expect(ui).toMatch(/Add measurement/);
    expect(ui).toMatch(/استخدام قالب/);
    expect(ui).toMatch(/Use template/);
  });

  it("renders dynamic fields and a preview", () => {
    expect(ui).toMatch(/selectedTemplate\.fields\.map/);
    expect(ui).toMatch(/draftPreview/);
    expect(ui).toMatch(/buildMeasurementFromTemplate/);
  });

  it("submits through the orchestrator wrapper", () => {
    expect(ui).toMatch(/createMeasurementsFromTemplate\(/);
  });

  it("never JSON.stringify-dumps template fields", () => {
    expect(ui).not.toMatch(/JSON\.stringify\([^)]*\.fields/);
    expect(ui).not.toMatch(/JSON\.stringify\(\s*selectedTemplate/);
  });

  it("keeps the manual measurement form intact", () => {
    expect(ui).toMatch(/insertWorkOrderMeasurement\(/);
    expect(ui).toMatch(/onSave/);
    expect(ui).toMatch(/form\.label/);
  });
});

/* ─────────── Security posture ─────────── */
describe("BUSINESS-WORKFLOW-5B security posture", () => {
  const targets = [
    "src/modules/workOrders/services/listMeasurementTemplates.ts",
    "src/modules/workOrders/services/getMeasurementTemplateByKey.ts",
    "src/modules/workOrders/services/createMeasurementsFromTemplate.ts",
    "src/modules/workOrders/services/buildMeasurementFromTemplate.ts",
    "src/components/workOrders/WorkOrderMeasurementsSection.tsx",
  ];

  it("no realtime / notifications / edge function wiring", () => {
    for (const f of targets) {
      const src = read(f);
      expect(src, f).not.toMatch(/supabase\.channel\(/);
      expect(src, f).not.toMatch(/postgres_changes/);
      expect(src, f).not.toMatch(/functions\.invoke\(/);
      expect(src, f).not.toMatch(/from\(['"]notifications['"]\)/);
    }
  });

  it("templates table is referenced only from the two wrapper services", () => {
    const offenders: string[] = [];
    const walk = (dir: string) => {
      for (const entry of readdirSync(join(ROOT, dir), { withFileTypes: true })) {
        const rel = `${dir}/${entry.name}`;
        if (entry.isDirectory()) {
          if (entry.name === "__tests__" || entry.name === "node_modules") continue;
          walk(rel);
        } else if (/\.(ts|tsx)$/.test(entry.name) && !/\.test\.(ts|tsx)$/.test(entry.name)) {
          const src = readFileSync(join(ROOT, rel), "utf8");
          if (src.includes("work_order_measurement_templates")) offenders.push(rel);
        }
      }
    };
    walk("src");
    // The auto-generated Supabase types file is allowed to reference the table.
    const filtered = offenders.filter((p) => p !== "src/integrations/supabase/types.ts").sort();
    expect(filtered).toEqual([
      "src/modules/workOrders/services/getMeasurementTemplateByKey.ts",
      "src/modules/workOrders/services/listMeasurementTemplates.ts",
    ]);
  });
});
