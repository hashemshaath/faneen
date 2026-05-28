/**
 * BUSINESS-WORKFLOW-5D — Create a quotation snapshot from a finalized BOQ.
 * The quotation freezes the BOQ totals + items at snapshot time. The source
 * BOQ is NEVER mutated. No contracts/invoices/notifications.
 */
import { supabase } from "@/integrations/supabase/client";
import { recordWorkOrderAudit } from "./recordWorkOrderAudit";
import type {
  WorkOrderBoqRow,
  WorkOrderBoqItemRow,
  WorkOrderQuotationRow,
  WorkOrderQuotationItemRow,
} from "../types";

export interface CreateQuotationFromBoqInput {
  boq: Pick<
    WorkOrderBoqRow,
    "id" | "work_order_id" | "business_id" | "status" | "subtotal" | "tax" | "total"
  >;
  items: ReadonlyArray<WorkOrderBoqItemRow>;
  created_by: string;
  title: string;
  notes?: string | null;
  currency?: string;
  valid_until?: string | null;
  quotation_number?: string | null;
}

export interface CreateQuotationFromBoqResult {
  quotation: WorkOrderQuotationRow | null;
  items: WorkOrderQuotationItemRow[];
  error: unknown;
}

export async function createQuotationFromBoq(
  input: CreateQuotationFromBoqInput,
): Promise<CreateQuotationFromBoqResult> {
  const title = (input.title ?? "").trim();
  if (!title) return { quotation: null, items: [], error: new Error("title_required") };
  if (title.length > 200) {
    return { quotation: null, items: [], error: new Error("title_too_long") };
  }
  if (!input.boq || input.boq.status !== "finalized") {
    return { quotation: null, items: [], error: new Error("boq_not_finalized") };
  }
  if (!input.created_by) {
    return { quotation: null, items: [], error: new Error("missing_required") };
  }

  const currency = (input.currency ?? "SAR").trim().toUpperCase();
  const number = (input.quotation_number ?? "").trim() || null;

  const { data: header, error: headerErr } = await supabase
    .from("work_order_quotations")
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .insert({
      work_order_id: input.boq.work_order_id,
      boq_id: input.boq.id,
      business_id: input.boq.business_id,
      status: "draft",
      quotation_number: number ?? "WOQ-DRAFT",
      title,
      notes: input.notes ?? null,
      subtotal: input.boq.subtotal,
      tax: input.boq.tax,
      total: input.boq.total,
      currency,
      valid_until: input.valid_until ?? null,
      created_by: input.created_by,
    } as any)
    .select(
      "id, ref_id, work_order_id, boq_id, business_id, status, quotation_number, title, notes, subtotal, tax, total, currency, valid_until, sent_at, viewed_at, approved_at, rejected_at, rejection_reason, approval_token_hash, pdf_attachment_id, created_by, created_at, updated_at, deleted_at",
    )
    .maybeSingle();

  if (headerErr || !header) {
    return { quotation: null, items: [], error: headerErr ?? new Error("quotation_insert_failed") };
  }

  let items: WorkOrderQuotationItemRow[] = [];
  if (input.items.length > 0) {
    const payload = input.items.map((it, idx) => ({
      quotation_id: header.id,
      boq_item_id: it.id,
      item_type: it.item_type,
      title_ar: it.title_ar,
      title_en: it.title_en,
      quantity: it.quantity,
      unit: it.unit,
      unit_price: it.unit_price,
      total_price: it.total_price,
      metadata: {},
      sort_order: it.sort_order ?? idx,
    }));
    const { data: rows, error: itemErr } = await supabase
      .from("work_order_quotation_items")
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .insert(payload as any)
      .select(
        "id, ref_id, quotation_id, boq_item_id, item_type, title_ar, title_en, quantity, unit, unit_price, total_price, metadata, sort_order, created_at, updated_at, deleted_at",
      );
    if (!itemErr && rows) items = rows as WorkOrderQuotationItemRow[];
  }

  await recordWorkOrderAudit({
    business_id: header.business_id,
    actor_id: input.created_by,
    entity_id: header.work_order_id,
    action: "work_order.quotation_created",
    metadata: {
      quotation_id: header.id,
      ref_id: header.ref_id,
      boq_id: input.boq.id,
      item_count: items.length,
    },
  });

  return { quotation: header as WorkOrderQuotationRow, items, error: null };
}