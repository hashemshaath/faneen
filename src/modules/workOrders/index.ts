/**
 * BUSINESS-CORE-3A — Work Orders module barrel.
 * All UI/pages MUST import from this module — never reach into
 * `supabase.from('work_orders'|'work_order_stages'|'work_order_tasks'|'work_order_comments')` directly.
 */
export * from "./types";
export { listWorkOrdersForBusiness } from "./services/listWorkOrdersForBusiness";
export { listAdminWorkOrders } from "./services/listAdminWorkOrders";
export type { ListAdminWorkOrdersOptions } from "./services/listAdminWorkOrders";
export { getWorkOrderById } from "./services/getWorkOrderById";
export { getWorkOrderByRefId } from "./services/getWorkOrderByRefId";
export { getWorkOrderTaskByRefId } from "./services/getWorkOrderTaskByRefId";
export type { GetWorkOrderTaskByRefIdResult } from "./services/getWorkOrderTaskByRefId";
export { searchWorkOrders } from "./services/searchWorkOrders";
export { createWorkOrder } from "./services/createWorkOrder";
export { createWorkOrderFromContract } from "./services/createWorkOrderFromContract";
export { createWorkOrderFromQuote } from "./services/createWorkOrderFromQuote";
export { createWorkOrderFromLead } from "./services/createWorkOrderFromLead";
export { createWorkOrderFromBooking } from "./services/createWorkOrderFromBooking";
export { updateWorkOrder } from "./services/updateWorkOrder";
export { recordWorkOrderAudit } from "./services/recordWorkOrderAudit";
export { listWorkOrderStages } from "./services/listWorkOrderStages";
export { updateWorkOrderStage } from "./services/updateWorkOrderStage";
export { listWorkOrderTasks } from "./services/listWorkOrderTasks";
export { createWorkOrderTask } from "./services/createWorkOrderTask";
export { updateWorkOrderTask } from "./services/updateWorkOrderTask";
export { listWorkOrderComments } from "./services/listWorkOrderComments";
export { addWorkOrderComment } from "./services/addWorkOrderComment";
export { softDeleteWorkOrderTask } from "./services/softDeleteWorkOrderTask";
export { softDeleteWorkOrder } from "./services/softDeleteWorkOrder";
// BUSINESS-WORKFLOW-2 — Duplicate-prevention lookup for source-to-WO conversion.
export { getWorkOrderBySource } from "./services/getWorkOrderBySource";
export type { GetWorkOrderBySourceInput } from "./services/getWorkOrderBySource";
// BUSINESS-ADMIN-4: admin-safe enrichment wrapper for TASK refs
export { getAdminTaskSummaryByRef } from "./services/getAdminTaskSummaryByRef";
export type { AdminTaskSummary } from "./services/getAdminTaskSummaryByRef";

// BUSINESS-WORKFLOW-4 — Attachments & Measurements
export { listWorkOrderAttachments } from "./services/listWorkOrderAttachments";
export { insertWorkOrderAttachment } from "./services/insertWorkOrderAttachment";
export type { InsertWorkOrderAttachmentInput } from "./services/insertWorkOrderAttachment";
export { softDeleteWorkOrderAttachment } from "./services/softDeleteWorkOrderAttachment";
// BUSINESS-WORKFLOW-5A — Private upload + signed preview pipeline.
export { createWorkOrderAttachmentUploadPath } from "./services/createWorkOrderAttachmentUploadPath";
export type { CreateWorkOrderAttachmentUploadPathInput } from "./services/createWorkOrderAttachmentUploadPath";
export {
  validateWorkOrderAttachmentFile,
  WORK_ORDER_ATTACHMENT_MAX_BYTES,
  WORK_ORDER_ATTACHMENT_ALLOWED_MIME,
} from "./services/validateWorkOrderAttachmentFile";
export type {
  WorkOrderAttachmentValidationCode,
  WorkOrderAttachmentValidationResult,
} from "./services/validateWorkOrderAttachmentFile";
export {
  uploadWorkOrderAttachmentFile,
  WORK_ORDER_ATTACHMENTS_BUCKET,
} from "./services/uploadWorkOrderAttachmentFile";
export {
  createWorkOrderAttachmentSignedUrl,
  WORK_ORDER_ATTACHMENT_SIGNED_URL_MAX_SECONDS,
} from "./services/createWorkOrderAttachmentSignedUrl";
export { getWorkOrderAttachmentPreviewUrl } from "./services/getWorkOrderAttachmentPreviewUrl";
export { listWorkOrderMeasurements } from "./services/listWorkOrderMeasurements";
export { insertWorkOrderMeasurement } from "./services/insertWorkOrderMeasurement";
export type { InsertWorkOrderMeasurementInput } from "./services/insertWorkOrderMeasurement";
export { updateWorkOrderMeasurement } from "./services/updateWorkOrderMeasurement";
export type { UpdateWorkOrderMeasurementPatch } from "./services/updateWorkOrderMeasurement";
export { softDeleteWorkOrderMeasurement } from "./services/softDeleteWorkOrderMeasurement";

// BUSINESS-WORKFLOW-5B — Measurement templates
export { listMeasurementTemplates } from "./services/listMeasurementTemplates";
export type { ListMeasurementTemplatesOptions } from "./services/listMeasurementTemplates";
export { getMeasurementTemplateByKey } from "./services/getMeasurementTemplateByKey";
export {
  buildMeasurementFromTemplate,
} from "./services/buildMeasurementFromTemplate";
export type {
  TemplateValueMap,
  BuildMeasurementError,
  BuildMeasurementErrorCode,
  BuildMeasurementResult,
  BuiltMeasurementDraft,
} from "./services/buildMeasurementFromTemplate";
export { createMeasurementsFromTemplate } from "./services/createMeasurementsFromTemplate";
export type {
  CreateMeasurementsFromTemplateInput,
  CreateMeasurementsFromTemplateResult,
} from "./services/createMeasurementsFromTemplate";

// BUSINESS-CORE-4 — shared lib helpers
export * from "./lib/statusHelpers";
export * from "./lib/source";
export * from "./lib/kpis";
export * from "./lib/useAssigneeNames";
// BUSINESS-WORKFLOW-2 — display-only SLA helpers
export * from "./lib/sla";