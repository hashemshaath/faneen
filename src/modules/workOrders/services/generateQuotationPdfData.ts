/**
 * BUSINESS-WORKFLOW-5D — Pure helper that prepares a printable bilingual
 * structure for the quotation PDF. NO supabase, NO fetch, NO DOM.
 */
import type {
  PublicQuotationView,
  WorkOrderQuotationItemRow,
  WorkOrderQuotationRow,
} from "../types";

export interface QuotationPdfLine {
  index: number;
  ref_id: string | null;
  title_ar: string;
  title_en: string;
  item_type: string;
  quantity: number;
  unit: string;
  unit_price: number;
  total_price: number;
}

export interface QuotationPdfData {
  ref_id: string;
  quotation_number: string;
  title: string;
  notes: string | null;
  status: string;
  currency: string;
  issue_date: string | null;
  valid_until: string | null;
  subtotal: number;
  tax: number;
  total: number;
  business: { name_ar: string | null; name_en: string | null; logo_url: string | null };
  lines: QuotationPdfLine[];
}

function safeNumber(n: unknown): number {
  const v = typeof n === "number" ? n : Number(n);
  return Number.isFinite(v) && v >= 0 ? v : 0;
}

/**
 * Dashboard variant — caller passes the header row, items, and a business
 * descriptor. Used by the manager-facing print preview.
 */
export function generateQuotationPdfData(input: {
  quotation: Pick<
    WorkOrderQuotationRow,
    | "ref_id"
    | "quotation_number"
    | "title"
    | "notes"
    | "status"
    | "currency"
    | "subtotal"
    | "tax"
    | "total"
    | "valid_until"
    | "sent_at"
    | "created_at"
  >;
  items: ReadonlyArray<WorkOrderQuotationItemRow>;
  business: { name_ar?: string | null; name_en?: string | null; logo_url?: string | null };
}): QuotationPdfData {
  return {
    ref_id: input.quotation.ref_id ?? "",
    quotation_number: input.quotation.quotation_number ?? "",
    title: input.quotation.title ?? "",
    notes: input.quotation.notes ?? null,
    status: input.quotation.status ?? "draft",
    currency: input.quotation.currency ?? "SAR",
    issue_date: input.quotation.sent_at ?? input.quotation.created_at ?? null,
    valid_until: input.quotation.valid_until ?? null,
    subtotal: safeNumber(input.quotation.subtotal),
    tax: safeNumber(input.quotation.tax),
    total: safeNumber(input.quotation.total),
    business: {
      name_ar: input.business.name_ar ?? null,
      name_en: input.business.name_en ?? null,
      logo_url: input.business.logo_url ?? null,
    },
    lines: input.items.map((it, idx) => ({
      index: idx + 1,
      ref_id: it.ref_id ?? null,
      title_ar: it.title_ar,
      title_en: it.title_en,
      item_type: it.item_type,
      quantity: safeNumber(it.quantity),
      unit: it.unit,
      unit_price: safeNumber(it.unit_price),
      total_price: safeNumber(it.total_price),
    })),
  };
}

/**
 * Public-viewer variant — accepts the redacted RPC payload from
 * `get_quotation_by_token` and produces the same printable structure.
 */
export function generateQuotationPdfDataFromPublicView(
  view: PublicQuotationView,
): QuotationPdfData {
  return {
    ref_id: view.ref_id,
    quotation_number: view.quotation_number,
    title: view.title,
    notes: view.notes ?? null,
    status: view.status,
    currency: view.currency,
    issue_date: view.sent_at ?? null,
    valid_until: view.valid_until ?? null,
    subtotal: safeNumber(view.subtotal),
    tax: safeNumber(view.tax),
    total: safeNumber(view.total),
    business: {
      name_ar: view.business?.name ?? null,
      name_en: view.business?.name_en ?? null,
      logo_url: view.business?.logo_url ?? null,
    },
    lines: (view.items ?? []).map((it, idx) => ({
      index: idx + 1,
      ref_id: it.ref_id ?? null,
      title_ar: it.title_ar,
      title_en: it.title_en,
      item_type: it.item_type,
      quantity: safeNumber(it.quantity),
      unit: it.unit,
      unit_price: safeNumber(it.unit_price),
      total_price: safeNumber(it.total_price),
    })),
  };
}