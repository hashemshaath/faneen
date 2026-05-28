/**
 * BUSINESS-WORKFLOW-5B — Orchestrator: load template, validate user
 * values, then create the corresponding measurement row through the
 * existing `insertWorkOrderMeasurement` wrapper. Manual measurement
 * entry is untouched.
 *
 * Returns the same `{ data, error }` envelope shape used elsewhere in
 * the module, plus a structured `validation` list when inputs fail.
 */
import type { WorkOrderMeasurementRow } from "../types";
import { getMeasurementTemplateByKey } from "./getMeasurementTemplateByKey";
import {
  buildMeasurementFromTemplate,
  type BuildMeasurementError,
  type TemplateValueMap,
} from "./buildMeasurementFromTemplate";
import { insertWorkOrderMeasurement } from "./insertWorkOrderMeasurement";

export interface CreateMeasurementsFromTemplateInput {
  workOrderId: string;
  businessId: string;
  recordedByUserId: string;
  templateKey: string;
  values: TemplateValueMap;
  notes?: string | null;
  taskId?: string | null;
}

export interface CreateMeasurementsFromTemplateResult {
  data: WorkOrderMeasurementRow[] | null;
  error: unknown;
  validation?: BuildMeasurementError[];
}

export async function createMeasurementsFromTemplate(
  input: CreateMeasurementsFromTemplateInput,
): Promise<CreateMeasurementsFromTemplateResult> {
  if (!input.workOrderId) return { data: null, error: new Error("work_order_id_required") };
  if (!input.businessId) return { data: null, error: new Error("business_id_required") };
  if (!input.recordedByUserId) return { data: null, error: new Error("recorded_by_user_id_required") };

  const { data: template, error: tplErr } = await getMeasurementTemplateByKey({
    templateKey: input.templateKey,
  });
  if (tplErr || !template) {
    return { data: null, error: tplErr ?? new Error("template_not_found") };
  }

  const built = buildMeasurementFromTemplate({
    template,
    values: input.values ?? {},
    notes: input.notes ?? null,
  });
  if (!built.ok || !built.draft) {
    return { data: null, error: new Error("template_validation_failed"), validation: built.errors };
  }

  const { data, error } = await insertWorkOrderMeasurement({
    work_order_id: input.workOrderId,
    business_id: input.businessId,
    recorded_by_user_id: input.recordedByUserId,
    task_id: input.taskId ?? null,
    measurement_type: built.draft.measurement_type,
    label: built.draft.label,
    width: built.draft.width,
    height: built.draft.height,
    depth: built.draft.depth,
    length: built.draft.length,
    quantity: built.draft.quantity,
    unit: built.draft.unit,
    notes: built.draft.notes,
    metadata: built.draft.metadata,
  });

  if (error || !data) return { data: null, error: error ?? new Error("insert_failed") };
  return { data: [data], error: null };
}
