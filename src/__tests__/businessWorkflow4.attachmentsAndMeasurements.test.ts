import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const SRC = join(ROOT, "src");
const MIGRATIONS = join(ROOT, "supabase/migrations");

function read(p: string): string { return readFileSync(p, "utf8"); }
function findMigration(needle: string): string | null {
  if (!existsSync(MIGRATIONS)) return null;
  for (const f of readdirSync(MIGRATIONS).filter((x) => x.endsWith(".sql"))) {
    const src = read(join(MIGRATIONS, f));
    if (src.includes(needle)) return src;
  }
  return null;
}

/* ─────────── Part A — Migration / schema / RLS ─────────── */
describe("BUSINESS-WORKFLOW-4: migration creates tables + RLS", () => {
  const sql = findMigration("public.work_order_attachments");

  it("migration exists and creates both tables", () => {
    expect(sql).not.toBeNull();
    expect(sql!).toMatch(/CREATE TABLE\s+public\.work_order_attachments/);
    expect(sql!).toMatch(/CREATE TABLE\s+public\.work_order_measurements/);
  });

  it("WOA-/WOM- ref prefixes are wired via sequences + triggers", () => {
    expect(sql!).toMatch(/work_order_attachments_ref_seq/);
    expect(sql!).toMatch(/work_order_measurements_ref_seq/);
    expect(sql!).toMatch(/'WOA-' \|\| nextval/);
    expect(sql!).toMatch(/'WOM-' \|\| nextval/);
  });

  it("RLS enabled; no anon access; service_role granted", () => {
    expect(sql!).toMatch(/ALTER TABLE public\.work_order_attachments ENABLE ROW LEVEL SECURITY/);
    expect(sql!).toMatch(/ALTER TABLE public\.work_order_measurements ENABLE ROW LEVEL SECURITY/);
    expect(sql!).not.toMatch(/GRANT[\s\S]{0,80}public\.work_order_attachments[\s\S]{0,80}TO anon/i);
    expect(sql!).not.toMatch(/GRANT[\s\S]{0,80}public\.work_order_measurements[\s\S]{0,80}TO anon/i);
    expect(sql!).toMatch(/GRANT[^;]*ON public\.work_order_attachments TO authenticated/);
    expect(sql!).toMatch(/GRANT[^;]*ON public\.work_order_measurements TO authenticated/);
    expect(sql!).toMatch(/GRANT ALL ON public\.work_order_attachments TO service_role/);
    expect(sql!).toMatch(/GRANT ALL ON public\.work_order_measurements TO service_role/);
  });

  it("policies use is_work_order_member / owner-or-manager helpers", () => {
    expect(sql!).toMatch(/is_work_order_member\(auth\.uid\(\)/);
    expect(sql!).toMatch(/is_business_owner_or_manager\(auth\.uid\(\)/);
  });

  it("unit allow-list and attachment_type allow-list are enforced via CHECK", () => {
    expect(sql!).toMatch(/unit\s+text[\s\S]+CHECK \(unit IN \('mm','cm','m','inch'\)\)/);
    expect(sql!).toMatch(/attachment_type[\s\S]+CHECK \(attachment_type IN \([\s\S]*?'general'[\s\S]*?'handover_document'[\s\S]*?\)\)/);
  });

  it("storage bucket work-order-files is created as PRIVATE", () => {
    expect(sql!).toMatch(/storage\.buckets[\s\S]+'work-order-files'[\s\S]+false/);
    expect(sql!).not.toMatch(/'work-order-files'[^,)]*,\s*true\s*\)/);
  });

  it("does NOT mutate work_orders / tasks / contracts / payments / leads / quotes / bookings", () => {
    const code = sql!.replace(/^--.*$/gm, "");
    expect(code).not.toMatch(/UPDATE\s+public\.work_orders\b/i);
    expect(code).not.toMatch(/UPDATE\s+public\.work_order_tasks\b/i);
    expect(code).not.toMatch(/UPDATE\s+public\.contracts\b/i);
    expect(code).not.toMatch(/UPDATE\s+public\.lead_requests\b/i);
    expect(code).not.toMatch(/UPDATE\s+public\.quote_requests\b/i);
    expect(code).not.toMatch(/UPDATE\s+public\.bookings\b/i);
    expect(code).not.toMatch(/installment_payments/i);
    expect(code).not.toMatch(/INSERT\s+INTO\s+public\.notifications/i);
  });
});

/* ─────────── Part B — services / wrappers ─────────── */
describe("BUSINESS-WORKFLOW-4: services & module barrel", () => {
  const barrel = read(join(SRC, "modules/workOrders/index.ts"));

  it("module barrel re-exports all 7 new wrappers", () => {
    for (const name of [
      "listWorkOrderAttachments",
      "insertWorkOrderAttachment",
      "softDeleteWorkOrderAttachment",
      "listWorkOrderMeasurements",
      "insertWorkOrderMeasurement",
      "updateWorkOrderMeasurement",
      "softDeleteWorkOrderMeasurement",
    ]) {
      expect(barrel).toMatch(new RegExp(`export[^;]*\\b${name}\\b`));
    }
  });

  it("wrappers exist as importable modules", async () => {
    const m = await import("@/modules/workOrders");
    expect(typeof m.listWorkOrderAttachments).toBe("function");
    expect(typeof m.insertWorkOrderAttachment).toBe("function");
    expect(typeof m.softDeleteWorkOrderAttachment).toBe("function");
    expect(typeof m.listWorkOrderMeasurements).toBe("function");
    expect(typeof m.insertWorkOrderMeasurement).toBe("function");
    expect(typeof m.updateWorkOrderMeasurement).toBe("function");
    expect(typeof m.softDeleteWorkOrderMeasurement).toBe("function");
  });

  it("insertWorkOrderAttachment validates required fields", async () => {
    const { insertWorkOrderAttachment } = await import("@/modules/workOrders");
    const r1 = await insertWorkOrderAttachment({
      work_order_id: "x", business_id: "y", uploaded_by_user_id: "u",
      file_path: "p", file_name: "  ",
    });
    expect((r1.error as Error).message).toBe("file_name_required");

    const r2 = await insertWorkOrderAttachment({
      work_order_id: "x", business_id: "y", uploaded_by_user_id: "u",
      file_path: "", file_name: "ok.pdf",
    });
    expect((r2.error as Error).message).toBe("file_path_required");

    const r3 = await insertWorkOrderAttachment({
      work_order_id: "x", business_id: "y", uploaded_by_user_id: "u",
      file_path: "p", file_name: "ok.pdf",
      file_size: -1,
    });
    expect((r3.error as Error).message).toBe("file_size_invalid");
  });

  it("insertWorkOrderMeasurement validates label, unit, numerics", async () => {
    const { insertWorkOrderMeasurement } = await import("@/modules/workOrders");
    const base = { work_order_id: "x", business_id: "y", recorded_by_user_id: "u", measurement_type: "site" };
    expect(((await insertWorkOrderMeasurement({ ...base, label: "" })).error as Error).message).toBe("label_required");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(((await insertWorkOrderMeasurement({ ...base, label: "L", unit: "feet" as any })).error as Error).message).toBe("unit_invalid");
    expect(((await insertWorkOrderMeasurement({ ...base, label: "L", width: -3 })).error as Error).message).toBe("numeric_invalid");
  });

  it("updateWorkOrderMeasurement whitelists fields (rejects unknown / empty patch)", async () => {
    const { updateWorkOrderMeasurement } = await import("@/modules/workOrders");
    const r = await updateWorkOrderMeasurement({ measurementId: "m", patch: {} });
    expect((r.error as Error).message).toBe("no_fields");
    // unknown fields are silently dropped — verify by passing unknown only
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const r2 = await updateWorkOrderMeasurement({ measurementId: "m", patch: { hacker: 1, business_id: "z" } as any });
    expect((r2.error as Error).message).toBe("no_fields");
  });

  it("services source files reference work_order_attachments / work_order_measurements only", () => {
    const files = [
      "modules/workOrders/services/listWorkOrderAttachments.ts",
      "modules/workOrders/services/insertWorkOrderAttachment.ts",
      "modules/workOrders/services/softDeleteWorkOrderAttachment.ts",
      "modules/workOrders/services/listWorkOrderMeasurements.ts",
      "modules/workOrders/services/insertWorkOrderMeasurement.ts",
      "modules/workOrders/services/updateWorkOrderMeasurement.ts",
      "modules/workOrders/services/softDeleteWorkOrderMeasurement.ts",
    ];
    for (const f of files) {
      const src = read(join(SRC, f));
      expect(src).not.toMatch(/\.channel\(|postgres_changes/);
      expect(src).not.toMatch(/whatsapp|sendTransactionalEmail|email-queue|notifications\//i);
    }
  });
});

/* ─────────── Part C — UI ─────────── */
describe("BUSINESS-WORKFLOW-4: detail page renders new sections", () => {
  const page = read(join(SRC, "pages/dashboard/DashboardWorkOrderDetail.tsx"));
  it("includes attachments + measurements sections", () => {
    expect(page).toMatch(/WorkOrderAttachmentsSection/);
    expect(page).toMatch(/WorkOrderMeasurementsSection/);
  });

  const att = read(join(SRC, "components/workOrders/WorkOrderAttachmentsSection.tsx"));
  const meas = read(join(SRC, "components/workOrders/WorkOrderMeasurementsSection.tsx"));

  it("attachments section uses canonical module wrappers — no supabase.from", () => {
    expect(att).not.toMatch(/supabase\.from\(/);
    expect(att).toMatch(/listWorkOrderAttachments/);
    expect(att).toMatch(/insertWorkOrderAttachment/);
    expect(att).toMatch(/softDeleteWorkOrderAttachment/);
  });
  it("measurements section uses canonical module wrappers — no supabase.from", () => {
    expect(meas).not.toMatch(/supabase\.from\(/);
    expect(meas).toMatch(/listWorkOrderMeasurements/);
    expect(meas).toMatch(/insertWorkOrderMeasurement/);
    expect(meas).toMatch(/softDeleteWorkOrderMeasurement/);
  });
  it("no raw storage public URL rendering, no JSON.stringify(metadata)", () => {
    for (const src of [att, meas]) {
      expect(src).not.toMatch(/getPublicUrl/);
      expect(src).not.toMatch(/JSON\.stringify\(\s*[^)]*metadata/);
    }
  });
  it("Arabic + English labels are present", () => {
    expect(att).toMatch(/المرفقات/);
    expect(att).toMatch(/Attachments/);
    expect(meas).toMatch(/المقاسات/);
    expect(meas).toMatch(/Measurements/);
    for (const ar of ["العرض","الارتفاع","العمق","الطول","الكمية","الوحدة","النوع"]) {
      expect(meas).toMatch(new RegExp(ar));
    }
    for (const en of ["Width","Height","Depth","Length","Quantity","Unit","Type"]) {
      expect(meas).toMatch(new RegExp(en));
    }
  });
});

/* ─────────── Part D — Audit / security baseline ─────────── */
describe("BUSINESS-WORKFLOW-4: audit events + security baseline", () => {
  const audit = read(join(SRC, "modules/workOrders/services/recordWorkOrderAudit.ts"));
  it("audit action union includes the 5 new events", () => {
    for (const a of [
      "work_order.attachment_added",
      "work_order.attachment_deleted",
      "work_order.measurement_added",
      "work_order.measurement_updated",
      "work_order.measurement_deleted",
    ]) {
      expect(audit).toMatch(new RegExp(a.replace(/\./g, "\\.")));
    }
  });

  it("audit metadata never carries PII or raw file_path / signed URLs", () => {
    const ins = read(join(SRC, "modules/workOrders/services/insertWorkOrderAttachment.ts"));
    // Find the audit metadata block — must not contain file_path / file_name / signedUrl
    const block = ins.split("recordWorkOrderAudit")[1] ?? "";
    expect(block).not.toMatch(/file_path/);
    expect(block).not.toMatch(/file_name/);
    expect(block).not.toMatch(/signed_url|signedUrl/i);
  });

  it("no new edge function, no cron, no notifications added in this phase", () => {
    const fnRoot = join(ROOT, "supabase/functions");
    if (existsSync(fnRoot)) {
      const dirs = readdirSync(fnRoot);
      expect(dirs).not.toContain("work-order-attachments");
      expect(dirs).not.toContain("work-order-measurements");
    }
  });
});