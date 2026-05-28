/**
 * BUSINESS-WORKFLOW-5B — Pure helper: turn a template + user values into
 * an `InsertWorkOrderMeasurementInput`-shaped payload (sans IDs). Lives
 * apart from the DB-calling orchestrator so it is trivially unit-testable.
 */
import type {
  WorkOrderMeasurementTemplateField,
  WorkOrderMeasurementTemplateRow,
  WorkOrderMeasurementUnit,
} from "../types";
import { WORK_ORDER_MEASUREMENT_MAPPED_COLUMNS } from "../types";

export type TemplateValueMap = Record<string, string | number | boolean | null | undefined>;

export type BuildMeasurementErrorCode =
  | "required_missing"
  | "negative_number"
  | "invalid_number"
  | "invalid_select";

export interface BuildMeasurementError {
  code: BuildMeasurementErrorCode;
  fieldKey: string;
}

export interface BuiltMeasurementDraft {
  measurement_type: string;
  label: string;
  width: number | null;
  height: number | null;
  depth: number | null;
  length: number | null;
  quantity: number;
  unit: WorkOrderMeasurementUnit;
  notes: string | null;
  metadata: Record<string, unknown>;
}

export interface BuildMeasurementResult {
  ok: boolean;
  errors: BuildMeasurementError[];
  draft: BuiltMeasurementDraft | null;
}

function coerceNumber(raw: unknown): { ok: boolean; value: number | null; negative: boolean } {
  if (raw === null || raw === undefined || raw === "") return { ok: true, value: null, negative: false };
  const n = typeof raw === "number" ? raw : Number(raw);
  if (!Number.isFinite(n)) return { ok: false, value: null, negative: false };
  if (n < 0) return { ok: false, value: n, negative: true };
  return { ok: true, value: n, negative: false };
}

export function buildMeasurementFromTemplate(input: {
  template: WorkOrderMeasurementTemplateRow;
  values: TemplateValueMap;
  notes?: string | null;
}): BuildMeasurementResult {
  const { template, values } = input;
  const errors: BuildMeasurementError[] = [];
  const cols: Record<string, number | null> = {
    width: null, height: null, depth: null, length: null, quantity: null,
  };
  const metadata: Record<string, unknown> = { template_key: template.template_key };
  let labelOverride: string | null = null;

  for (const field of template.fields as WorkOrderMeasurementTemplateField[]) {
    const raw = values?.[field.key];
    const isEmpty = raw === undefined || raw === null || raw === "";

    if (field.required && isEmpty) {
      errors.push({ code: "required_missing", fieldKey: field.key });
      continue;
    }
    if (isEmpty) continue;

    if (field.type === "number") {
      const c = coerceNumber(raw);
      if (!c.ok) {
        errors.push({ code: c.negative ? "negative_number" : "invalid_number", fieldKey: field.key });
        continue;
      }
      if (field.maps_to && WORK_ORDER_MEASUREMENT_MAPPED_COLUMNS.includes(field.maps_to)) {
        cols[field.maps_to] = c.value;
      } else {
        metadata[field.key] = c.value;
      }
      continue;
    }

    if (field.type === "select") {
      const allowed = (field.options ?? []).map((o) => o.value);
      if (allowed.length > 0 && !allowed.includes(String(raw))) {
        errors.push({ code: "invalid_select", fieldKey: field.key });
        continue;
      }
      metadata[field.key] = String(raw);
      continue;
    }

    if (field.type === "boolean") {
      metadata[field.key] = Boolean(raw);
      continue;
    }

    // text
    const txt = String(raw).trim();
    if (txt.length === 0) continue;
    if (field.key === "label") {
      labelOverride = txt.slice(0, 200);
    } else {
      metadata[field.key] = txt.slice(0, 500);
    }
  }

  if (errors.length > 0) return { ok: false, errors, draft: null };

  const label =
    (labelOverride ?? "").length > 0
      ? (labelOverride as string)
      : template.title_en.slice(0, 200);

  const notes = (input.notes ?? "").trim();
  return {
    ok: true,
    errors: [],
    draft: {
      measurement_type: template.default_measurement_type,
      label,
      width: cols.width,
      height: cols.height,
      depth: cols.depth,
      length: cols.length,
      quantity: cols.quantity ?? 1,
      unit: template.default_unit,
      notes: notes.length > 0 ? notes.slice(0, 1000) : null,
      metadata,
    },
  };
}
