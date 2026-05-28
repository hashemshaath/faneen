/**
 * BUSINESS-WORKFLOW-5B — Load a single active template by `template_key`.
 */
import { supabase } from "@/integrations/supabase/client";
import type {
  WorkOrderMeasurementTemplateField,
  WorkOrderMeasurementTemplateRow,
} from "../types";

const COLS =
  "id, ref_id, sector_key, template_key, title_ar, title_en, description_ar, description_en, default_measurement_type, default_unit, fields, is_active, sort_order, created_at, updated_at";

export async function getMeasurementTemplateByKey(input: {
  templateKey: string;
}): Promise<{ data: WorkOrderMeasurementTemplateRow | null; error: unknown }> {
  const key = (input.templateKey ?? "").trim();
  if (!key) return { data: null, error: new Error("template_key_required") };
  const { data, error } = await supabase
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .from("work_order_measurement_templates" as any)
    .select(COLS)
    .eq("template_key", key)
    .eq("is_active", true)
    .maybeSingle();
  if (error || !data) return { data: null, error };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const row = data as any;
  return {
    data: {
      ...row,
      fields: Array.isArray(row.fields)
        ? (row.fields as WorkOrderMeasurementTemplateField[])
        : [],
    } as WorkOrderMeasurementTemplateRow,
    error: null,
  };
}
