/**
 * BUSINESS-CORE-3A — Work Order domain types.
 *
 * Single source of truth for the work-order family of tables. UI/services
 * MUST import from this module barrel — never reach into
 * `@/integrations/supabase/types` directly.
 */
import type { Database } from "@/integrations/supabase/types";

export type WorkOrderRow =
  Database["public"]["Tables"]["work_orders"]["Row"];
export type WorkOrderInsert =
  Database["public"]["Tables"]["work_orders"]["Insert"];
export type WorkOrderUpdate =
  Database["public"]["Tables"]["work_orders"]["Update"];

export type WorkOrderStageRow =
  Database["public"]["Tables"]["work_order_stages"]["Row"];
export type WorkOrderStageInsert =
  Database["public"]["Tables"]["work_order_stages"]["Insert"];
export type WorkOrderStageUpdate =
  Database["public"]["Tables"]["work_order_stages"]["Update"];

export type WorkOrderTaskRow =
  Database["public"]["Tables"]["work_order_tasks"]["Row"];
export type WorkOrderTaskInsert =
  Database["public"]["Tables"]["work_order_tasks"]["Insert"];
export type WorkOrderTaskUpdate =
  Database["public"]["Tables"]["work_order_tasks"]["Update"];

export type WorkOrderCommentRow =
  Database["public"]["Tables"]["work_order_comments"]["Row"];
export type WorkOrderCommentInsert =
  Database["public"]["Tables"]["work_order_comments"]["Insert"];

export type WorkOrderStatus =
  | "draft"
  | "active"
  | "on_hold"
  | "completed"
  | "cancelled";

export type WorkOrderPriority = "low" | "medium" | "high" | "urgent";

export type WorkOrderStageStatus =
  | "pending"
  | "active"
  | "completed"
  | "skipped";

export type WorkOrderTaskStatus =
  | "todo"
  | "in_progress"
  | "blocked"
  | "completed"
  | "archived";

/**
 * Canonical default lifecycle stages seeded on manual work-order creation.
 * Keep keys stable — they are persisted on each stage row.
 */
export const DEFAULT_WORK_ORDER_STAGES: ReadonlyArray<{
  key: string;
  title_ar: string;
  title_en: string;
}> = [
  { key: "lead_received", title_ar: "وصول الطلب", title_en: "Lead received" },
  { key: "site_visit", title_ar: "معاينة الموقع", title_en: "Site visit" },
  { key: "measurements", title_ar: "المقاسات", title_en: "Measurements" },
  { key: "quote", title_ar: "عرض السعر", title_en: "Quote" },
  { key: "approval", title_ar: "الاعتماد", title_en: "Approval" },
  { key: "contract", title_ar: "العقد", title_en: "Contract" },
  { key: "advance_payment", title_ar: "الدفعة المقدمة", title_en: "Advance payment" },
  { key: "procurement", title_ar: "شراء المواد", title_en: "Procurement" },
  { key: "fabrication", title_ar: "التصنيع", title_en: "Fabrication" },
  { key: "installation", title_ar: "التركيب", title_en: "Installation" },
  { key: "handover", title_ar: "التسليم", title_en: "Handover" },
  { key: "warranty", title_ar: "الضمان", title_en: "Warranty" },
];

/* ─────────────────────────────────────────────────────────────────────────
 * BUSINESS-WORKFLOW-4 — Attachments & Measurements
 * ──────────────────────────────────────────────────────────────────────── */

export type WorkOrderAttachmentType =
  | "general"
  | "measurement_photo"
  | "drawing"
  | "quote_file"
  | "contract_file"
  | "installation_photo"
  | "handover_document";

export const WORK_ORDER_ATTACHMENT_TYPES: ReadonlyArray<WorkOrderAttachmentType> = [
  "general",
  "measurement_photo",
  "drawing",
  "quote_file",
  "contract_file",
  "installation_photo",
  "handover_document",
];

export interface WorkOrderAttachmentRow {
  id: string;
  ref_id: string | null;
  work_order_id: string;
  task_id: string | null;
  business_id: string;
  uploaded_by_user_id: string;
  file_path: string;
  file_name: string;
  file_type: string | null;
  file_size: number | null;
  attachment_type: WorkOrderAttachmentType;
  created_at: string;
  deleted_at: string | null;
}

export type WorkOrderMeasurementUnit = "mm" | "cm" | "m" | "inch";

export const WORK_ORDER_MEASUREMENT_UNITS: ReadonlyArray<WorkOrderMeasurementUnit> = [
  "mm",
  "cm",
  "m",
  "inch",
];

export const WORK_ORDER_MEASUREMENT_TYPES: ReadonlyArray<string> = [
  "site",
  "kitchen",
  "window",
  "door",
  "facade",
  "glass",
  "steel",
  "wood",
  "custom",
];

export interface WorkOrderMeasurementRow {
  id: string;
  ref_id: string | null;
  work_order_id: string;
  task_id: string | null;
  business_id: string;
  recorded_by_user_id: string;
  measurement_type: string;
  label: string;
  width: number | null;
  height: number | null;
  depth: number | null;
  length: number | null;
  quantity: number | null;
  unit: WorkOrderMeasurementUnit;
  notes: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

/* ─────────────────────────────────────────────────────────────
 * BUSINESS-WORKFLOW-5B — Measurement templates
 * ───────────────────────────────────────────────────────────── */
export type WorkOrderMeasurementTemplateFieldType =
  | "number"
  | "text"
  | "select"
  | "boolean";

export const WORK_ORDER_MEASUREMENT_TEMPLATE_FIELD_TYPES: ReadonlyArray<WorkOrderMeasurementTemplateFieldType> = [
  "number",
  "text",
  "select",
  "boolean",
];

/** Standard work_order_measurements row columns a field may map into. */
export type WorkOrderMeasurementMappedColumn =
  | "width"
  | "height"
  | "depth"
  | "length"
  | "quantity";

export const WORK_ORDER_MEASUREMENT_MAPPED_COLUMNS: ReadonlyArray<WorkOrderMeasurementMappedColumn> = [
  "width",
  "height",
  "depth",
  "length",
  "quantity",
];

export interface WorkOrderMeasurementTemplateFieldOption {
  value: string;
  label_ar: string;
  label_en: string;
}

export interface WorkOrderMeasurementTemplateField {
  key: string;
  label_ar: string;
  label_en: string;
  type: WorkOrderMeasurementTemplateFieldType;
  unit?: WorkOrderMeasurementUnit;
  required?: boolean;
  options?: WorkOrderMeasurementTemplateFieldOption[];
  maps_to?: WorkOrderMeasurementMappedColumn;
}

export interface WorkOrderMeasurementTemplateRow {
  id: string;
  ref_id: string | null;
  sector_key: string;
  template_key: string;
  title_ar: string;
  title_en: string;
  description_ar: string | null;
  description_en: string | null;
  default_measurement_type: string;
  default_unit: WorkOrderMeasurementUnit;
  fields: WorkOrderMeasurementTemplateField[];
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

/* ─────────────────────────────────────────────────────────────
 * BUSINESS-WORKFLOW-5C — Bill of Quantities (BOQ)
 * ───────────────────────────────────────────────────────────── */

export type WorkOrderBoqStatus = "draft" | "finalized";

export const WORK_ORDER_BOQ_STATUSES: ReadonlyArray<WorkOrderBoqStatus> = [
  "draft",
  "finalized",
];

export type WorkOrderBoqItemType =
  | "material"
  | "labor"
  | "service"
  | "fabrication";

export const WORK_ORDER_BOQ_ITEM_TYPES: ReadonlyArray<WorkOrderBoqItemType> = [
  "material",
  "labor",
  "service",
  "fabrication",
];

export interface WorkOrderBoqRow {
  id: string;
  ref_id: string | null;
  work_order_id: string;
  business_id: string;
  title: string;
  status: WorkOrderBoqStatus;
  notes: string | null;
  subtotal: number;
  tax: number;
  total: number;
  created_by: string;
  finalized_at: string | null;
  finalized_by: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface WorkOrderBoqItemRow {
  id: string;
  ref_id: string | null;
  boq_id: string;
  measurement_id: string | null;
  item_type: WorkOrderBoqItemType;
  title_ar: string;
  title_en: string;
  quantity: number;
  unit: string;
  unit_price: number;
  total_price: number;
  metadata: Record<string, unknown>;
  sort_order: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

/* ─────────────────────────────────────────────────────────────
 * BUSINESS-WORKFLOW-5D — Quotations (snapshot from finalized BOQ)
 * ───────────────────────────────────────────────────────────── */

export type WorkOrderQuotationStatus =
  | "draft"
  | "sent"
  | "viewed"
  | "approved"
  | "rejected"
  | "expired";

export const WORK_ORDER_QUOTATION_STATUSES: ReadonlyArray<WorkOrderQuotationStatus> = [
  "draft",
  "sent",
  "viewed",
  "approved",
  "rejected",
  "expired",
];

export interface WorkOrderQuotationRow {
  id: string;
  ref_id: string | null;
  work_order_id: string;
  boq_id: string;
  business_id: string;
  status: WorkOrderQuotationStatus;
  quotation_number: string;
  title: string;
  notes: string | null;
  subtotal: number;
  tax: number;
  total: number;
  currency: string;
  valid_until: string | null;
  sent_at: string | null;
  viewed_at: string | null;
  approved_at: string | null;
  rejected_at: string | null;
  rejection_reason: string | null;
  approval_token_hash: string | null;
  pdf_attachment_id: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface WorkOrderQuotationItemRow {
  id: string;
  ref_id: string | null;
  quotation_id: string;
  boq_item_id: string | null;
  item_type: WorkOrderBoqItemType;
  title_ar: string;
  title_en: string;
  quantity: number;
  unit: string;
  unit_price: number;
  total_price: number;
  metadata: Record<string, unknown>;
  sort_order: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

/** Public-facing payload returned by the tokenized client viewer RPC. */
export interface PublicQuotationView {
  ref_id: string;
  status: WorkOrderQuotationStatus;
  quotation_number: string;
  title: string;
  notes: string | null;
  subtotal: number;
  tax: number;
  total: number;
  currency: string;
  valid_until: string | null;
  sent_at: string | null;
  viewed_at: string | null;
  approved_at: string | null;
  rejected_at: string | null;
  rejection_reason: string | null;
  items: Array<{
    id: string;
    ref_id: string | null;
    item_type: WorkOrderBoqItemType;
    title_ar: string;
    title_en: string;
    quantity: number;
    unit: string;
    unit_price: number;
    total_price: number;
    sort_order: number;
  }>;
  business: {
    name?: string | null;
    name_en?: string | null;
    logo_url?: string | null;
  };
}