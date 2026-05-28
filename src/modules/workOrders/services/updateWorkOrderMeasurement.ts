import { supabase } from "@/integrations/supabase/client";
import type {
  WorkOrderMeasurementRow,
  WorkOrderMeasurementUnit,
} from "../types";
import { WORK_ORDER_MEASUREMENT_UNITS } from "../types";
import { recordWorkOrderAudit } from "./recordWorkOrderAudit";

export interface UpdateWorkOrderMeasurementPatch {
  measurement_type?: string;
  label?: string;
  width?: number | null;
  height?: number | null;
  depth?: number | null;
  length?: number | null;
  quantity?: number | null;
  unit?: WorkOrderMeasurementUnit;
  notes?: string | null;
}

const ALLOWED_KEYS: ReadonlyArray<keyof UpdateWorkOrderMeasurementPatch> = [
  "measurement_type",
  "label",
  "width",
  "height",
  "depth",
  "length",
  "quantity",
  "unit",
  "notes",
];

function validNonNeg(n: number | null | undefined): boolean {
  return n == null || (Number.isFinite(n) && n >= 0);
}

export async function updateWorkOrderMeasurement(options: {
  measurementId: string;
  patch: UpdateWorkOrderMeasurementPatch;
  actorUserId?: string | null;
  businessId?: string | null;
  workOrderId?: string | null;
}): Promise<{ data: WorkOrderMeasurementRow | null; error: unknown }> {
  const clean: Record<string, unknown> = {};
  for (const key of ALLOWED_KEYS) {
    if (key in options.patch) clean[key] = options.patch[key];
  }

  if (typeof clean.label === "string") {
    const v = (clean.label as string).trim();
    if (v.length === 0) return { data: null, error: new Error("label_required") };
    if (v.length > 200) return { data: null, error: new Error("label_too_long") };
    clean.label = v;
  }
  if (typeof clean.measurement_type === "string") {
    const v = (clean.measurement_type as string).trim();
    if (v.length === 0) return { data: null, error: new Error("measurement_type_required") };
    if (v.length > 50) return { data: null, error: new Error("measurement_type_too_long") };
    clean.measurement_type = v;
  }
  if (clean.unit !== undefined) {
    if (!WORK_ORDER_MEASUREMENT_UNITS.includes(clean.unit as WorkOrderMeasurementUnit)) {
      return { data: null, error: new Error("unit_invalid") };
    }
  }
  for (const k of ["width", "height", "depth", "length", "quantity"] as const) {
    if (k in clean && !validNonNeg(clean[k] as number | null)) {
      return { data: null, error: new Error("numeric_invalid") };
    }
  }

  if (Object.keys(clean).length === 0) {
    return { data: null, error: new Error("no_fields") };
  }

  const { data, error } = await supabase
    .from("work_order_measurements")
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .update(clean as any)
    .eq("id", options.measurementId)
    .select(
      "id, ref_id, work_order_id, task_id, business_id, recorded_by_user_id, measurement_type, label, width, height, depth, length, quantity, unit, notes, metadata, created_at, updated_at, deleted_at",
    )
    .maybeSingle();

  if (!error && data && options.actorUserId && options.businessId && options.workOrderId) {
    await recordWorkOrderAudit({
      business_id: options.businessId,
      actor_id: options.actorUserId,
      entity_id: options.workOrderId,
      action: "work_order.measurement_updated",
      metadata: {
        measurement_id: options.measurementId,
        fields: Object.keys(clean),
      },
    });
  }

  return { data: (data as WorkOrderMeasurementRow | null) ?? null, error };
}