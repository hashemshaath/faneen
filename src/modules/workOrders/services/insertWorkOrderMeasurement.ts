import { supabase } from "@/integrations/supabase/client";
import type {
  WorkOrderMeasurementRow,
  WorkOrderMeasurementUnit,
} from "../types";
import { WORK_ORDER_MEASUREMENT_UNITS } from "../types";
import { recordWorkOrderAudit } from "./recordWorkOrderAudit";

export interface InsertWorkOrderMeasurementInput {
  work_order_id: string;
  business_id: string;
  recorded_by_user_id: string;
  measurement_type: string;
  label: string;
  width?: number | null;
  height?: number | null;
  depth?: number | null;
  length?: number | null;
  quantity?: number | null;
  unit?: WorkOrderMeasurementUnit;
  notes?: string | null;
  metadata?: Record<string, unknown>;
  task_id?: string | null;
}

function validNonNeg(n: number | null | undefined): boolean {
  return n == null || (Number.isFinite(n) && n >= 0);
}

export async function insertWorkOrderMeasurement(
  input: InsertWorkOrderMeasurementInput,
): Promise<{ data: WorkOrderMeasurementRow | null; error: unknown }> {
  const label = (input.label ?? "").trim();
  const measurement_type = (input.measurement_type ?? "").trim();
  if (label.length === 0) return { data: null, error: new Error("label_required") };
  if (label.length > 200) return { data: null, error: new Error("label_too_long") };
  if (measurement_type.length === 0) return { data: null, error: new Error("measurement_type_required") };
  if (measurement_type.length > 50) return { data: null, error: new Error("measurement_type_too_long") };
  const unit: WorkOrderMeasurementUnit = input.unit ?? "cm";
  if (!WORK_ORDER_MEASUREMENT_UNITS.includes(unit)) {
    return { data: null, error: new Error("unit_invalid") };
  }
  if (
    !validNonNeg(input.width) ||
    !validNonNeg(input.height) ||
    !validNonNeg(input.depth) ||
    !validNonNeg(input.length) ||
    !validNonNeg(input.quantity)
  ) {
    return { data: null, error: new Error("numeric_invalid") };
  }

  const payload = {
    work_order_id: input.work_order_id,
    task_id: input.task_id ?? null,
    business_id: input.business_id,
    recorded_by_user_id: input.recorded_by_user_id,
    measurement_type,
    label,
    width: input.width ?? null,
    height: input.height ?? null,
    depth: input.depth ?? null,
    length: input.length ?? null,
    quantity: input.quantity ?? 1,
    unit,
    notes: input.notes ?? null,
    metadata: input.metadata ?? {},
  };

  const { data, error } = await supabase
    .from("work_order_measurements")
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .insert(payload as any)
    .select(
      "id, ref_id, work_order_id, task_id, business_id, recorded_by_user_id, measurement_type, label, width, height, depth, length, quantity, unit, notes, metadata, created_at, updated_at, deleted_at",
    )
    .maybeSingle();

  if (!error && data) {
    await recordWorkOrderAudit({
      business_id: input.business_id,
      actor_id: input.recorded_by_user_id,
      entity_id: input.work_order_id,
      action: "work_order.measurement_added",
      metadata: {
        measurement_id: data.id,
        ref_id: data.ref_id,
        task_id: data.task_id,
        measurement_type: data.measurement_type,
        unit: data.unit,
      },
    });
  }

  return { data: (data as WorkOrderMeasurementRow | null) ?? null, error };
}