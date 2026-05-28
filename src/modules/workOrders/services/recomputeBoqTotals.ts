/**
 * BUSINESS-WORKFLOW-5C — Recompute and persist BOQ header totals from items.
 * Pure-math part is exported separately so it can be tested without I/O.
 */
import { supabase } from "@/integrations/supabase/client";
import type { WorkOrderBoqItemRow, WorkOrderBoqRow } from "../types";

export const BOQ_VAT_RATE = 0.15;

export interface BoqTotals {
  subtotal: number;
  tax: number;
  total: number;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function computeBoqTotals(
  items: ReadonlyArray<Pick<WorkOrderBoqItemRow, "quantity" | "unit_price">>,
  vatRate: number = BOQ_VAT_RATE,
): BoqTotals {
  const safeRate = Number.isFinite(vatRate) && vatRate >= 0 ? vatRate : 0;
  const subtotal = items.reduce((acc, it) => {
    const q = Number.isFinite(it.quantity) && it.quantity >= 0 ? it.quantity : 0;
    const u = Number.isFinite(it.unit_price) && it.unit_price >= 0 ? it.unit_price : 0;
    return acc + q * u;
  }, 0);
  const tax = subtotal * safeRate;
  return {
    subtotal: round2(subtotal),
    tax: round2(tax),
    total: round2(subtotal + tax),
  };
}

export async function recomputeBoqTotals(
  boqId: string,
): Promise<{ data: WorkOrderBoqRow | null; error: unknown }> {
  const { data: items, error: itemsError } = await supabase
    .from("work_order_boq_items")
    .select("quantity, unit_price")
    .eq("boq_id", boqId)
    .is("deleted_at", null);
  if (itemsError) return { data: null, error: itemsError };

  const totals = computeBoqTotals(items ?? []);

  const { data, error } = await supabase
    .from("work_order_boqs")
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .update({
      subtotal: totals.subtotal,
      tax: totals.tax,
      total: totals.total,
    } as any)
    .eq("id", boqId)
    .select(
      "id, ref_id, work_order_id, business_id, title, status, notes, subtotal, tax, total, created_by, finalized_at, finalized_by, created_at, updated_at, deleted_at",
    )
    .maybeSingle();
  return { data: (data as WorkOrderBoqRow | null) ?? null, error };
}