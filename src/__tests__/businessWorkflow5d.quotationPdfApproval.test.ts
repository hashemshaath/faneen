/**
 * BUSINESS-WORKFLOW-5D — Quotations from finalized BOQ, PDF data helper,
 * and client approval flow. Runtime tests for the pure PDF helper plus
 * source-level invariants for migration, services, UI, route, and security.
 */
import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import {
  generateQuotationPdfData,
  generateQuotationPdfDataFromPublicView,
  generateQuotationApprovalToken,
  WORK_ORDER_QUOTATION_STATUSES,
  type WorkOrderQuotationRow,
  type WorkOrderQuotationItemRow,
  type PublicQuotationView,
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

function makeQuotation(): WorkOrderQuotationRow {
  return {
    id: "q-1", ref_id: "WOQ-1001",
    work_order_id: "wo-1", boq_id: "boq-1", business_id: "biz-1",
    status: "draft", quotation_number: "WOQ-1001",
    title: "Kitchen quote", notes: "Thanks",
    subtotal: 100, tax: 15, total: 115, currency: "SAR",
    valid_until: null, sent_at: null, viewed_at: null,
    approved_at: null, rejected_at: null, rejection_reason: null,
    approval_token_hash: null, pdf_attachment_id: null,
    created_by: "user-1",
    created_at: new Date("2026-05-28T00:00:00Z").toISOString(),
    updated_at: new Date().toISOString(),
    deleted_at: null,
  };
}

function makeItem(over: Partial<WorkOrderQuotationItemRow> = {}): WorkOrderQuotationItemRow {
  return {
    id: "qi-1", ref_id: "WOQI-1001",
    quotation_id: "q-1", boq_item_id: "bi-1",
    item_type: "material",
    title_ar: "بند", title_en: "Item",
    quantity: 2, unit: "m2", unit_price: 50, total_price: 100,
    metadata: {}, sort_order: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    deleted_at: null,
    ...over,
  };
}

/* ─── Migration / schema ─── */
describe("BUSINESS-WORKFLOW-5D migration", () => {
  const sql = findMigration("public.work_order_quotations");

  it("creates the quotation header + items tables", () => {
    expect(sql).not.toBeNull();
    expect(sql!).toMatch(/CREATE TABLE public\.work_order_quotations/);
    expect(sql!).toMatch(/CREATE TABLE public\.work_order_quotation_items/);
  });

  it("wires WOQ- + WOQI- ref prefixes via sequences", () => {
    expect(sql!).toMatch(/work_order_quotations_ref_seq/);
    expect(sql!).toMatch(/work_order_quotation_items_ref_seq/);
    expect(sql!).toMatch(/'WOQ-' \|\| nextval/);
    expect(sql!).toMatch(/'WOQI-' \|\| nextval/);
  });

  it("status allow-list is sealed", () => {
    expect(sql!).toMatch(/status[^;]*CHECK \(status IN \('draft','sent','viewed','approved','rejected','expired'\)\)/);
  });

  it("non-negative numeric + token-hash length constraints", () => {
    expect(sql!).toMatch(/CHECK \(subtotal >= 0\)/);
    expect(sql!).toMatch(/CHECK \(tax >= 0\)/);
    expect(sql!).toMatch(/CHECK \(total >= 0\)/);
    expect(sql!).toMatch(/char_length\(approval_token_hash\) = 64/);
  });

  it("RLS enabled and no anon grant on quotation tables", () => {
    expect(sql!).toMatch(/ALTER TABLE public\.work_order_quotations ENABLE ROW LEVEL SECURITY/);
    expect(sql!).toMatch(/ALTER TABLE public\.work_order_quotation_items ENABLE ROW LEVEL SECURITY/);
    expect(sql!).not.toMatch(/GRANT[^;]*ON public\.work_order_quotation[_a-z]*[^;]*TO anon/i);
    expect(sql!).toMatch(/CREATE POLICY "wo_quotations_select_member"/);
    expect(sql!).toMatch(/CREATE POLICY "wo_quotations_insert_manager"/);
    expect(sql!).toMatch(/CREATE POLICY "wo_quoi_select_member"/);
    expect(sql!).toMatch(/CREATE POLICY "wo_quoi_insert_manager_draft"/);
  });

  it("immutability + lock triggers exist", () => {
    expect(sql!).toMatch(/quotation_snapshot_locked/);
    expect(sql!).toMatch(/quotation_locked/);
  });

  it("tokenized RPCs created with SECURITY DEFINER + anon execute", () => {
    expect(sql!).toMatch(/FUNCTION public\.get_quotation_by_token/);
    expect(sql!).toMatch(/FUNCTION public\.approve_quotation_by_token/);
    expect(sql!).toMatch(/FUNCTION public\.reject_quotation_by_token/);
    expect(sql!).toMatch(/SECURITY DEFINER/);
    expect(sql!).toMatch(/GRANT EXECUTE ON FUNCTION public\.get_quotation_by_token[^;]*TO anon/);
    expect(sql!).toMatch(/GRANT EXECUTE ON FUNCTION public\.approve_quotation_by_token[^;]*TO anon/);
    expect(sql!).toMatch(/GRANT EXECUTE ON FUNCTION public\.reject_quotation_by_token[^;]*TO anon/);
  });

  it("token compared via SHA-256 hash only — raw token never stored", () => {
    expect(sql!).toMatch(/encode\(extensions\.digest\(_token, 'sha256'\), 'hex'\)/);
    expect(sql!).not.toMatch(/approval_token text/);
  });

  it("does NOT alter contracts/payments/invoices tables", () => {
    expect(sql!).not.toMatch(/ALTER TABLE\s+public\.contracts/i);
    expect(sql!).not.toMatch(/CREATE TABLE\s+public\.invoices/i);
    expect(sql!).not.toMatch(/payments/i);
  });
});

/* ─── PDF data helper (pure) ─── */
describe("generateQuotationPdfData", () => {
  it("preserves header totals and item ordering", () => {
    const q = makeQuotation();
    const items = [
      makeItem({ id: "a", sort_order: 0, title_en: "A" }),
      makeItem({ id: "b", sort_order: 1, title_en: "B" }),
    ];
    const out = generateQuotationPdfData({ quotation: q, items, business: {} });
    expect(out.subtotal).toBe(100);
    expect(out.tax).toBe(15);
    expect(out.total).toBe(115);
    expect(out.lines).toHaveLength(2);
    expect(out.lines[0].index).toBe(1);
    expect(out.lines[1].index).toBe(2);
  });

  it("clamps negative / NaN numerics to zero", () => {
    const q = { ...makeQuotation(), subtotal: -5, tax: Number.NaN, total: -1 };
    const out = generateQuotationPdfData({ quotation: q, items: [], business: {} });
    expect(out.subtotal).toBe(0);
    expect(out.tax).toBe(0);
    expect(out.total).toBe(0);
  });

  it("public-view variant produces the same bilingual structure", () => {
    const view: PublicQuotationView = {
      ref_id: "WOQ-1", status: "sent",
      quotation_number: "WOQ-1", title: "T", notes: null,
      subtotal: 10, tax: 1.5, total: 11.5, currency: "SAR",
      valid_until: null, sent_at: null, viewed_at: null,
      approved_at: null, rejected_at: null, rejection_reason: null,
      items: [{
        id: "i", ref_id: "WOQI-1", item_type: "material",
        title_ar: "أ", title_en: "A", quantity: 1, unit: "pcs",
        unit_price: 10, total_price: 10, sort_order: 0,
      }],
      business: { name: "Biz", name_en: "Biz EN", logo_url: null },
    };
    const out = generateQuotationPdfDataFromPublicView(view);
    expect(out.lines[0].title_en).toBe("A");
    expect(out.business.name_ar).toBe("Biz");
    expect(out.business.name_en).toBe("Biz EN");
  });

  it("status allow-list is sealed", () => {
    expect(WORK_ORDER_QUOTATION_STATUSES).toEqual([
      "draft","sent","viewed","approved","rejected","expired",
    ]);
  });
});

/* ─── Token generation ─── */
describe("generateQuotationApprovalToken", () => {
  it("produces a high-entropy hex token of length >= 32", () => {
    const t = generateQuotationApprovalToken();
    expect(typeof t).toBe("string");
    expect(t.length).toBeGreaterThanOrEqual(64);
    expect(t).toMatch(/^[0-9a-f]+$/);
    const t2 = generateQuotationApprovalToken();
    expect(t).not.toBe(t2);
  });
});

/* ─── Service source-level invariants ─── */
describe("BUSINESS-WORKFLOW-5D services source", () => {
  const files = [
    "src/modules/workOrders/services/createQuotationFromBoq.ts",
    "src/modules/workOrders/services/listWorkOrderQuotations.ts",
    "src/modules/workOrders/services/listQuotationItems.ts",
    "src/modules/workOrders/services/sendWorkOrderQuotation.ts",
    "src/modules/workOrders/services/getQuotationByToken.ts",
    "src/modules/workOrders/services/approveWorkOrderQuotation.ts",
    "src/modules/workOrders/services/rejectWorkOrderQuotation.ts",
    "src/modules/workOrders/services/generateQuotationPdfData.ts",
  ];

  it("all service files exist", () => {
    for (const f of files) expect(existsSync(join(ROOT, f)), f).toBe(true);
  });

  it("barrel exports the new quotation surface", () => {
    const barrel = read("src/modules/workOrders/index.ts");
    for (const n of [
      "createQuotationFromBoq",
      "listWorkOrderQuotations",
      "listQuotationItems",
      "sendWorkOrderQuotation",
      "getQuotationByToken",
      "approveWorkOrderQuotation",
      "rejectWorkOrderQuotation",
      "generateQuotationPdfData",
    ]) expect(barrel).toMatch(new RegExp(n));
  });

  it("services touch ONLY quotation/boq/audit tables — no payments/contracts/invoices/notifications", () => {
    const forbidden = [
      /from\(['"]payments['"]\)/,
      /from\(['"]invoices['"]\)/,
      /from\(['"]contracts['"]\)/,
      /from\(['"]contract_payments['"]\)/,
      /from\(['"]quotes['"]\)/,
      /from\(['"]notifications['"]\)/,
      /from\(['"]user_roles['"]\)/,
    ];
    for (const f of files) {
      const src = read(f);
      for (const r of forbidden) expect(src, f).not.toMatch(r);
    }
  });

  it("services do NOT wire realtime, external PDF SaaS, puppeteer, or external HTTP", () => {
    for (const f of files) {
      const src = read(f);
      expect(src, f).not.toMatch(/supabase\.channel\(/);
      expect(src, f).not.toMatch(/postgres_changes/);
      expect(src, f).not.toMatch(/functions\.invoke\(/);
      expect(src, f).not.toMatch(/fetch\(['"]https?:/);
      expect(src, f).not.toMatch(/puppeteer/);
      expect(src, f).not.toMatch(/playwright/);
    }
  });

  it("PDF data helper is pure (no supabase / no DOM)", () => {
    const src = read("src/modules/workOrders/services/generateQuotationPdfData.ts");
    expect(src).not.toMatch(/from ['"]@\/integrations\/supabase/);
    expect(src).not.toMatch(/document\./);
    expect(src).not.toMatch(/window\./);
  });

  it("approve/reject services never log the raw token", () => {
    for (const f of [
      "src/modules/workOrders/services/approveWorkOrderQuotation.ts",
      "src/modules/workOrders/services/rejectWorkOrderQuotation.ts",
      "src/modules/workOrders/services/sendWorkOrderQuotation.ts",
    ]) {
      const src = read(f);
      expect(src, f).not.toMatch(/console\.(log|info|debug|warn)\([^)]*token/i);
    }
  });
});

/* ─── UI invariants ─── */
describe("BUSINESS-WORKFLOW-5D UI", () => {
  it("dashboard section uses inline forms (no modals) and module services", () => {
    const src = read("src/components/workOrders/WorkOrderQuotationsSection.tsx");
    expect(src).toMatch(/data-testid="wo-quotations-section"/);
    expect(src).toMatch(/data-testid="wo-quotations-generate-btn"/);
    expect(src).toMatch(/data-testid="wo-quotations-print-btn"/);
    expect(src).toMatch(/data-testid="wo-quotations-send-btn"/);
    expect(src).not.toMatch(/from ['"]@\/components\/ui\/dialog['"]/);
    expect(src).not.toMatch(/from ['"]@\/components\/ui\/alert-dialog['"]/);
    expect(src).not.toMatch(/<Dialog[\s>]/);
    expect(src).not.toMatch(/<AlertDialog[\s>]/);
    expect(src).not.toMatch(/from ['"]@\/integrations\/supabase\/client['"]/);
    expect(src).not.toMatch(/supabase\.from\(/);
  });

  it("printable component is pure presentational, supports AR + EN", () => {
    const src = read("src/components/workOrders/WorkOrderQuotationPdf.tsx");
    expect(src).toMatch(/data-testid="wo-quotation-pdf"/);
    expect(src).toMatch(/عرض سعر/);
    expect(src).toMatch(/Quotation/);
    expect(src).toMatch(/طباعة PDF/);
    expect(src).toMatch(/Print PDF/);
    expect(src).toMatch(/صالح حتى/);
    expect(src).toMatch(/Valid until/);
    expect(src).not.toMatch(/from ['"]@\/integrations\/supabase/);
  });

  it("section is mounted in the work-order detail page", () => {
    const page = read("src/pages/dashboard/DashboardWorkOrderDetail.tsx");
    expect(page).toMatch(/WorkOrderQuotationsSection/);
  });

  it("public viewer page uses module services and no direct supabase.from", () => {
    const src = read("src/pages/QuotationViewer.tsx");
    expect(src).toMatch(/data-testid="wo-quotation-viewer"/);
    expect(src).toMatch(/data-testid="wo-quotation-viewer-approve"/);
    expect(src).toMatch(/data-testid="wo-quotation-viewer-reject"/);
    expect(src).toMatch(/getQuotationByToken/);
    expect(src).toMatch(/approveWorkOrderQuotation/);
    expect(src).toMatch(/rejectWorkOrderQuotation/);
    expect(src).toMatch(/useNoIndex/);
    expect(src).not.toMatch(/supabase\.from\(/);
    expect(src).not.toMatch(/from ['"]@\/integrations\/supabase\/client['"]/);
    expect(src).not.toMatch(/<Dialog[\s>]/);
    expect(src).not.toMatch(/<AlertDialog[\s>]/);
  });

  it("public route /q/:refId is wired in App.tsx", () => {
    const app = read("src/App.tsx");
    expect(app).toMatch(/QuotationViewer/);
    expect(app).toMatch(/path="\/q\/:refId"/);
  });
});

/* ─── Security posture ─── */
describe("BUSINESS-WORKFLOW-5D security posture", () => {
  it("no signed-URL / public-URL leakage in quotation services", () => {
    const dir = "src/modules/workOrders/services";
    for (const f of readdirSync(join(ROOT, dir))) {
      if (!/[Qq]uotation/.test(f)) continue;
      const src = read(`${dir}/${f}`);
      expect(src, f).not.toMatch(/createSignedUrl/);
      expect(src, f).not.toMatch(/getPublicUrl/);
    }
  });

  it("quotation tables referenced only via module services + supabase types", () => {
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
            /from\(['"]work_order_quotations['"]\)/.test(code) ||
            /from\(['"]work_order_quotation_items['"]\)/.test(code)
          ) offenders.push(rel);
        }
      }
    };
    walk("src");
    const allowed = new Set([
      "src/modules/workOrders/services/createQuotationFromBoq.ts",
      "src/modules/workOrders/services/listWorkOrderQuotations.ts",
      "src/modules/workOrders/services/listQuotationItems.ts",
      "src/modules/workOrders/services/sendWorkOrderQuotation.ts",
    ]);
    const unexpected = offenders.filter((p) => !allowed.has(p));
    expect(unexpected).toEqual([]);
  });
});