/**
 * BUSINESS-WORKFLOW-5C — Create a new draft BOQ + its items from measurements.
 * Regenerating creates a NEW draft BOQ each time; existing BOQs are untouched.
 * Measurements are NEVER mutated.
 */
import { supabase } from "@/integrations/supabase/client";
import {
  generateBoqItemsFromMeasurements,
  type BoqItemDraft,
} from "./generateBoqItemsFromMeasurements";
import { recordWorkOrderAudit } from "./recordWorkOrderAudit";
import type {
  WorkOrderBoqRow,
  WorkOrderBoqItemRow,
  WorkOrderMeasurementRow,
} from "../types";

export interface CreateBoqFromMeasurementsInput {
  work_order_id: string;
  business_id: string;
  created_by: string;
  sector_key: string;
  title: string;
  notes?: string | null;
  measurements: ReadonlyArray<WorkOrderMeasurementRow>;
}

export interface CreateBoqFromMeasurementsResult {
  boq: WorkOrderBoqRow | null;
  items: WorkOrderBoqItemRow[];
  error: unknown;
}

export async function createBoqFromMeasurements(
  input: CreateBoqFromMeasurementsInput,
): Promise<CreateBoqFromMeasurementsResult> {
  const title = (input.title ?? "").trim();
  if (!title) return { boq: null, items: [], error: new Error("title_required") };
  if (title.length > 200) {
    return { boq: null, items: [], error: new Error("title_too_long") };
  }
  if (!input.work_order_id || !input.business_id || !input.created_by) {
    return { boq: null, items: [], error: new Error("missing_required") };
  }

  const drafts: BoqItemDraft[] = generateBoqItemsFromMeasurements({
    sectorKey: input.sector_key,
    measurements: input.measurements,
  });

  // 1) Insert header.
  const { data: header, error: headerError } = await supabase
    .from("work_order_boqs")
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .insert({
      work_order_id: input.work_order_id,
      business_id: input.business_id,
      title,
      status: "draft",
      notes: input.notes ?? null,
      created_by: input.created_by,
    } as any)
    .select(
      "id, ref_id, work_order_id, business_id, title, status, notes, subtotal, tax, total, created_by, finalized_at, finalized_by, created_at, updated_at, deleted_at",
    )
    .maybeSingle();

  if (headerError || !header) {
    return { boq: null, items: [], error: headerError ?? new Error("boq_insert_failed") };
  }

  // 2) Insert items (best-effort: if items fail, the BOQ stays as an empty draft).
  let items: WorkOrderBoqItemRow[] = [];
  if (drafts.length > 0) {
    const payload = drafts.map((d) => ({
      boq_id: header.id,
      measurement_id: d.measurement_id,
      item_type: d.item_type,
      title_ar: d.title_ar,
      title_en: d.title_en,
      quantity: d.quantity,
      unit: d.unit,
      unit_price: d.unit_price,
      total_price: 0,
      metadata: d.metadata,
      sort_order: d.sort_order,
      // RFQ-BRAND-PICKER-1C — generated items NEVER auto-assign a brand.
      brand_id: null,
      brand_lock: null,
    }));
    const { data: itemRows, error: itemErr } = await supabase
      .from("work_order_boq_items")
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .insert(payload as any)
      .select(
        "id, ref_id, boq_id, measurement_id, item_type, title_ar, title_en, quantity, unit, unit_price, total_price, metadata, sort_order, brand_id, brand_lock, created_at, updated_at, deleted_at",
      );
    if (!itemErr && itemRows) items = itemRows as WorkOrderBoqItemRow[];
  }

  await recordWorkOrderAudit({
    business_id: input.business_id,
    actor_id: input.created_by,
    entity_id: input.work_order_id,
    action: "work_order.boq_generated",
    metadata: {
      boq_id: header.id,
      ref_id: header.ref_id,
      sector_key: input.sector_key,
      item_count: items.length,
    },
  });

  return { boq: header as WorkOrderBoqRow, items, error: null };
}