/**
 * BUSINESS-WORKFLOW-5B — List active measurement templates, optionally
 * filtered by sector. Reads from public.work_order_measurement_templates
 * which is RLS-gated to authenticated users only.
 */
import { supabase } from "@/integrations/supabase/client";
import type {
  WorkOrderMeasurementTemplateField,
  WorkOrderMeasurementTemplateRow,
} from "../types";

const COLS =
  "id, ref_id, sector_key, template_key, title_ar, title_en, description_ar, description_en, default_measurement_type, default_unit, fields, is_active, sort_order, created_at, updated_at";

export interface ListMeasurementTemplatesOptions {
  sectorKey?: string | null;
}

export async function listMeasurementTemplates(
  options: ListMeasurementTemplatesOptions = {},
): Promise<{ data: WorkOrderMeasurementTemplateRow[] | null; error: unknown }> {
  let q = supabase
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .from("work_order_measurement_templates" as any)
    .select(COLS)
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .order("title_en", { ascending: true });
  if (options.sectorKey) q = q.eq("sector_key", options.sectorKey);
  const { data, error } = await q;
  if (error || !data) return { data: null, error };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rows = (data as any[]).map((r) => ({
    ...r,
    fields: Array.isArray(r.fields)
      ? (r.fields as WorkOrderMeasurementTemplateField[])
      : [],
  })) as WorkOrderMeasurementTemplateRow[];
  return { data: rows, error: null };
}
