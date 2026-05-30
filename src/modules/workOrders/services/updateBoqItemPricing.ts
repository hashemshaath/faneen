/**
 * BUSINESS-WORKFLOW-5C — Update a draft BOQ item's quantity/unit_price.
 * total_price is recomputed by a DB trigger. Finalized BOQ items are
 * blocked by RLS — no client-side bypass.
 */
import { supabase } from "@/integrations/supabase/client";
import type { WorkOrderBoqItemRow } from "../types";
import { isValidBrandLock, type BrandLock } from "@/modules/brands/lib/brandSelectionRules";

export interface UpdateBoqItemPricingPatch {
  quantity?: number;
  unit?: string;
  unit_price?: number;
  title_ar?: string;
  title_en?: string;
  /** RFQ-BRAND-PICKER-1C — null clears the brand link (and forces lock=null). */
  brand_id?: string | null;
  brand_lock?: BrandLock | null;
}

export async function updateBoqItemPricing(
  itemId: string,
  patch: UpdateBoqItemPricingPatch,
): Promise<{ data: WorkOrderBoqItemRow | null; error: unknown }> {
  const update: Record<string, unknown> = {};
  if (patch.quantity !== undefined) {
    if (!Number.isFinite(patch.quantity) || patch.quantity < 0) {
      return { data: null, error: new Error("quantity_invalid") };
    }
    update.quantity = patch.quantity;
  }
  if (patch.unit_price !== undefined) {
    if (!Number.isFinite(patch.unit_price) || patch.unit_price < 0) {
      return { data: null, error: new Error("unit_price_invalid") };
    }
    update.unit_price = patch.unit_price;
  }
  if (patch.unit !== undefined) {
    const u = patch.unit.trim();
    if (u.length === 0 || u.length > 20) {
      return { data: null, error: new Error("unit_invalid") };
    }
    update.unit = u;
  }
  if (patch.title_ar !== undefined) {
    const t = patch.title_ar.trim();
    if (t.length === 0 || t.length > 200) {
      return { data: null, error: new Error("title_ar_invalid") };
    }
    update.title_ar = t;
  }
  if (patch.title_en !== undefined) {
    const t = patch.title_en.trim();
    if (t.length === 0 || t.length > 200) {
      return { data: null, error: new Error("title_en_invalid") };
    }
    update.title_en = t;
  }
  if (patch.brand_id !== undefined) {
    if (patch.brand_id !== null && typeof patch.brand_id !== "string") {
      return { data: null, error: new Error("brand_id_invalid") };
    }
    update.brand_id = patch.brand_id;
    // Clearing brand also clears lock to keep semantics consistent.
    if (patch.brand_id === null) update.brand_lock = null;
  }
  if (patch.brand_lock !== undefined) {
    if (patch.brand_lock !== null && !isValidBrandLock(patch.brand_lock)) {
      return { data: null, error: new Error("brand_lock_invalid") };
    }
    update.brand_lock = patch.brand_lock;
  }
  if (Object.keys(update).length === 0) {
    return { data: null, error: new Error("no_changes") };
  }

  const { data, error } = await supabase
    .from("work_order_boq_items")
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .update(update as any)
    .eq("id", itemId)
    .select(
      "id, ref_id, boq_id, measurement_id, item_type, title_ar, title_en, quantity, unit, unit_price, total_price, metadata, sort_order, brand_id, brand_lock, created_at, updated_at, deleted_at",
    )
    .maybeSingle();
  return { data: (data as WorkOrderBoqItemRow | null) ?? null, error };
}