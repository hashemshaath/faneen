/**
 * BUSINESS-WORKFLOW-5C — Pure BOQ generation engine.
 *
 * Converts a list of work-order measurements into draft BOQ line items
 * based on the business sector. No I/O. No pricing logic (unit_price is
 * always 0). The source measurements are NEVER mutated.
 *
 * Output rows are ready to be inserted via createBoqFromMeasurements.
 */
import type {
  WorkOrderMeasurementRow,
  WorkOrderMeasurementUnit,
  WorkOrderBoqItemType,
} from "../types";

/** Sector keys understood by the generator. Anything else falls back to
 *  a generic line per measurement. */
export type BoqSectorKey =
  | "kitchen"
  | "aluminum"
  | "glass"
  | "steel"
  | "wood"
  | "facade"
  | "fabrication"
  | "general";

export const BOQ_SECTOR_KEYS: ReadonlyArray<BoqSectorKey> = [
  "kitchen",
  "aluminum",
  "glass",
  "steel",
  "wood",
  "facade",
  "fabrication",
  "general",
];

export interface BoqItemDraft {
  /** Source measurement row id. null for synthetic rows (e.g. backsplash). */
  measurement_id: string | null;
  item_type: WorkOrderBoqItemType;
  title_ar: string;
  title_en: string;
  quantity: number;
  unit: string;
  /** Always 0 in 5C — pricing is set by the user later. */
  unit_price: number;
  metadata: Record<string, unknown>;
  sort_order: number;
  /** RFQ-BRAND-PICKER-1C — generator NEVER auto-assigns brands.
   *  Field is optional in the draft type; persisted as null in
   *  createBoqFromMeasurements (see brand_id/brand_lock mapping). */
  brand_id?: null;
  brand_lock?: null;
}

export interface GenerateBoqItemsInput {
  sectorKey: string;
  measurements: ReadonlyArray<WorkOrderMeasurementRow>;
}

/* ─────────── helpers ─────────── */

/** Convert a length value in the measurement's unit into meters. */
function toMeters(value: number | null, unit: WorkOrderMeasurementUnit): number {
  if (value == null || !Number.isFinite(value) || value < 0) return 0;
  switch (unit) {
    case "mm": return value / 1000;
    case "cm": return value / 100;
    case "m": return value;
    case "inch": return value * 0.0254;
    default: return 0;
  }
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function safeQty(n: number | null): number {
  if (n == null || !Number.isFinite(n) || n < 0) return 1;
  return n;
}

function normalizeSector(input: string): BoqSectorKey {
  const s = (input ?? "").trim().toLowerCase();
  if ((BOQ_SECTOR_KEYS as readonly string[]).includes(s)) return s as BoqSectorKey;
  return "general";
}

/* ─────────── per-sector generators ─────────── */

/** Kitchen: width × height -> sqm panel, optional countertop length -> lm,
 *  optional backsplash sqm metadata flag -> separate row. */
function fromKitchen(m: WorkOrderMeasurementRow, idx: number): BoqItemDraft[] {
  const out: BoqItemDraft[] = [];
  const qty = safeQty(m.quantity);
  const widthM = toMeters(m.width, m.unit);
  const heightM = toMeters(m.height, m.unit);
  const lengthM = toMeters(m.length, m.unit);
  if (widthM > 0 && heightM > 0) {
    out.push({
      measurement_id: m.id,
      item_type: "material",
      title_ar: `${m.label} — لوحة`,
      title_en: `${m.label} — Panel`,
      quantity: round2(widthM * heightM * qty),
      unit: "m2",
      unit_price: 0,
      metadata: { source: "kitchen.panel", measurement_ref: m.ref_id },
      sort_order: idx * 10,
    });
  }
  if (lengthM > 0) {
    out.push({
      measurement_id: m.id,
      item_type: "material",
      title_ar: `${m.label} — سطح/كاونتر`,
      title_en: `${m.label} — Countertop`,
      quantity: round2(lengthM * qty),
      unit: "lm",
      unit_price: 0,
      metadata: { source: "kitchen.countertop", measurement_ref: m.ref_id },
      sort_order: idx * 10 + 1,
    });
  }
  return out;
}

/** Windows / aluminum frames: width × height -> sqm, frame perimeter -> lm. */
function fromWindow(m: WorkOrderMeasurementRow, idx: number): BoqItemDraft[] {
  const out: BoqItemDraft[] = [];
  const qty = safeQty(m.quantity);
  const widthM = toMeters(m.width, m.unit);
  const heightM = toMeters(m.height, m.unit);
  if (widthM > 0 && heightM > 0) {
    const sqm = round2(widthM * heightM * qty);
    const perimeterLm = round2(2 * (widthM + heightM) * qty);
    out.push({
      measurement_id: m.id,
      item_type: "material",
      title_ar: `${m.label} — زجاج`,
      title_en: `${m.label} — Glass`,
      quantity: sqm,
      unit: "m2",
      unit_price: 0,
      metadata: { source: "window.glass", measurement_ref: m.ref_id },
      sort_order: idx * 10,
    });
    out.push({
      measurement_id: m.id,
      item_type: "material",
      title_ar: `${m.label} — إطار`,
      title_en: `${m.label} — Frame`,
      quantity: perimeterLm,
      unit: "lm",
      unit_price: 0,
      metadata: { source: "window.frame", measurement_ref: m.ref_id },
      sort_order: idx * 10 + 1,
    });
  }
  return out;
}

/** Steel: length × quantity -> lm, optional weight metadata -> kg row. */
function fromSteel(m: WorkOrderMeasurementRow, idx: number): BoqItemDraft[] {
  const out: BoqItemDraft[] = [];
  const qty = safeQty(m.quantity);
  const lengthM = toMeters(m.length, m.unit);
  if (lengthM > 0) {
    out.push({
      measurement_id: m.id,
      item_type: "fabrication",
      title_ar: `${m.label} — تصنيع`,
      title_en: `${m.label} — Fabrication`,
      quantity: round2(lengthM * qty),
      unit: "lm",
      unit_price: 0,
      metadata: { source: "steel.fabrication", measurement_ref: m.ref_id },
      sort_order: idx * 10,
    });
  }
  return out;
}

/** Glass: width × height -> sqm; carry thickness in metadata if present. */
function fromGlass(m: WorkOrderMeasurementRow, idx: number): BoqItemDraft[] {
  const out: BoqItemDraft[] = [];
  const qty = safeQty(m.quantity);
  const widthM = toMeters(m.width, m.unit);
  const heightM = toMeters(m.height, m.unit);
  if (widthM > 0 && heightM > 0) {
    const thickness =
      typeof m.metadata?.glass_thickness === "number"
        ? m.metadata.glass_thickness
        : null;
    out.push({
      measurement_id: m.id,
      item_type: "material",
      title_ar: `${m.label} — زجاج`,
      title_en: `${m.label} — Glass`,
      quantity: round2(widthM * heightM * qty),
      unit: "m2",
      unit_price: 0,
      metadata: {
        source: "glass.sheet",
        measurement_ref: m.ref_id,
        ...(thickness != null ? { thickness_mm: thickness } : {}),
      },
      sort_order: idx * 10,
    });
  }
  return out;
}

/** Wood: width × height -> sqm panel, optional length -> lm trim. */
function fromWood(m: WorkOrderMeasurementRow, idx: number): BoqItemDraft[] {
  const out: BoqItemDraft[] = [];
  const qty = safeQty(m.quantity);
  const widthM = toMeters(m.width, m.unit);
  const heightM = toMeters(m.height, m.unit);
  const lengthM = toMeters(m.length, m.unit);
  if (widthM > 0 && heightM > 0) {
    out.push({
      measurement_id: m.id,
      item_type: "material",
      title_ar: `${m.label} — خشب`,
      title_en: `${m.label} — Wood panel`,
      quantity: round2(widthM * heightM * qty),
      unit: "m2",
      unit_price: 0,
      metadata: { source: "wood.panel", measurement_ref: m.ref_id },
      sort_order: idx * 10,
    });
  } else if (lengthM > 0) {
    out.push({
      measurement_id: m.id,
      item_type: "material",
      title_ar: `${m.label} — خشب`,
      title_en: `${m.label} — Wood trim`,
      quantity: round2(lengthM * qty),
      unit: "lm",
      unit_price: 0,
      metadata: { source: "wood.trim", measurement_ref: m.ref_id },
      sort_order: idx * 10,
    });
  }
  return out;
}

/** Facade panel: width × height -> sqm cladding. */
function fromFacade(m: WorkOrderMeasurementRow, idx: number): BoqItemDraft[] {
  const out: BoqItemDraft[] = [];
  const qty = safeQty(m.quantity);
  const widthM = toMeters(m.width, m.unit);
  const heightM = toMeters(m.height, m.unit);
  if (widthM > 0 && heightM > 0) {
    out.push({
      measurement_id: m.id,
      item_type: "material",
      title_ar: `${m.label} — كسوة واجهة`,
      title_en: `${m.label} — Facade cladding`,
      quantity: round2(widthM * heightM * qty),
      unit: "m2",
      unit_price: 0,
      metadata: { source: "facade.panel", measurement_ref: m.ref_id },
      sort_order: idx * 10,
    });
  }
  return out;
}

/** Generic / fabrication fallback: pick best-fit derived quantity. */
function fromGeneric(
  m: WorkOrderMeasurementRow,
  idx: number,
  itemType: WorkOrderBoqItemType,
): BoqItemDraft[] {
  const qty = safeQty(m.quantity);
  const widthM = toMeters(m.width, m.unit);
  const heightM = toMeters(m.height, m.unit);
  const lengthM = toMeters(m.length, m.unit);

  let quantity = qty;
  let unit = "pcs";
  if (widthM > 0 && heightM > 0) {
    quantity = round2(widthM * heightM * qty);
    unit = "m2";
  } else if (lengthM > 0) {
    quantity = round2(lengthM * qty);
    unit = "lm";
  }

  return [
    {
      measurement_id: m.id,
      item_type: itemType,
      title_ar: m.label,
      title_en: m.label,
      quantity,
      unit,
      unit_price: 0,
      metadata: { source: "generic", measurement_ref: m.ref_id },
      sort_order: idx * 10,
    },
  ];
}

/* ─────────── public API ─────────── */

export function generateBoqItemsFromMeasurements(
  input: GenerateBoqItemsInput,
): BoqItemDraft[] {
  const sector = normalizeSector(input.sectorKey);
  const rows: BoqItemDraft[] = [];
  input.measurements.forEach((m, idx) => {
    // Defensive copy: NEVER mutate caller's measurements.
    const safe = { ...m, metadata: { ...(m.metadata ?? {}) } };
    let part: BoqItemDraft[] = [];
    switch (sector) {
      case "kitchen":
        part = fromKitchen(safe, idx);
        break;
      case "aluminum":
        part = fromWindow(safe, idx);
        break;
      case "steel":
        part = fromSteel(safe, idx);
        break;
      case "glass":
        part = fromGlass(safe, idx);
        break;
      case "wood":
        part = fromWood(safe, idx);
        break;
      case "facade":
        part = fromFacade(safe, idx);
        break;
      case "fabrication":
        part = fromGeneric(safe, idx, "fabrication");
        break;
      default:
        part = fromGeneric(safe, idx, "material");
    }
    if (part.length === 0) {
      // Always emit at least one row so the user can edit.
      part = fromGeneric(safe, idx, "material");
    }
    rows.push(...part);
  });
  return rows;
}