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

// BUSINESS-WORKFLOW-5C — Bill of Quantities (BOQ)
export {
  generateBoqItemsFromMeasurements,
  BOQ_SECTOR_KEYS,
} from "./services/generateBoqItemsFromMeasurements";
export type {
  BoqSectorKey,
  BoqItemDraft,
  GenerateBoqItemsInput,
} from "./services/generateBoqItemsFromMeasurements";
export { createBoqFromMeasurements } from "./services/createBoqFromMeasurements";
export type {
  CreateBoqFromMeasurementsInput,
  CreateBoqFromMeasurementsResult,
} from "./services/createBoqFromMeasurements";
export { listWorkOrderBoqs } from "./services/listWorkOrderBoqs";
export { listBoqItems } from "./services/listBoqItems";
export { updateBoqItemPricing } from "./services/updateBoqItemPricing";
export type { UpdateBoqItemPricingPatch } from "./services/updateBoqItemPricing";
export {
  computeBoqTotals,
  recomputeBoqTotals,
  BOQ_VAT_RATE,
} from "./services/recomputeBoqTotals";
export type { BoqTotals } from "./services/recomputeBoqTotals";
export { finalizeBoq } from "./services/finalizeBoq";

// BUSINESS-WORKFLOW-5D — Quotations (snapshot from finalized BOQ)
export { createQuotationFromBoq } from "./services/createQuotationFromBoq";
export type {
  CreateQuotationFromBoqInput,
  CreateQuotationFromBoqResult,
} from "./services/createQuotationFromBoq";
export { listWorkOrderQuotations } from "./services/listWorkOrderQuotations";
export { listQuotationItems } from "./services/listQuotationItems";
export {
  sendWorkOrderQuotation,
  generateQuotationApprovalToken,
} from "./services/sendWorkOrderQuotation";
export type {
  SendWorkOrderQuotationInput,
  SendWorkOrderQuotationResult,
} from "./services/sendWorkOrderQuotation";
export { getQuotationByToken } from "./services/getQuotationByToken";
export { approveWorkOrderQuotation } from "./services/approveWorkOrderQuotation";
export type { ApproveWorkOrderQuotationInput } from "./services/approveWorkOrderQuotation";
export { rejectWorkOrderQuotation } from "./services/rejectWorkOrderQuotation";
export type { RejectWorkOrderQuotationInput } from "./services/rejectWorkOrderQuotation";
// BUSINESS-WORKFLOW-5E — Contract draft conversion from approved quotation.
export { createContractDraftFromApprovedQuotation } from "./services/createContractDraftFromApprovedQuotation";
export type {
  CreateContractDraftFromApprovedQuotationInput,
  CreateContractDraftFromApprovedQuotationResult,
} from "./services/createContractDraftFromApprovedQuotation";
export {
  generateQuotationPdfData,
  generateQuotationPdfDataFromPublicView,
} from "./services/generateQuotationPdfData";
export type {
  QuotationPdfData,
  QuotationPdfLine,
} from "./services/generateQuotationPdfData";

// BUSINESS-WORKFLOW-6 — Production & Fabrication Pipeline
export {
  transitionWorkOrderStage,
  WORK_ORDER_PIPELINE_STAGES,
} from "./services/transitionWorkOrderStage";
export type {
  TransitionWorkOrderStageInput,
  TransitionWorkOrderStageResult,
  WorkOrderPipelineStage,
} from "./services/transitionWorkOrderStage";
export {
  assignWorkOrderStageUser,
  listWorkOrderStageAssignments,
} from "./services/assignWorkOrderStageUser";
export type { AssignWorkOrderStageUserInput } from "./services/assignWorkOrderStageUser";
export { unassignWorkOrderStage } from "./services/unassignWorkOrderStage";
export type { UnassignWorkOrderStageInput } from "./services/unassignWorkOrderStage";
export { listWorkOrderPipelineEvents } from "./services/listWorkOrderPipelineEvents";
export {
  listWorkOrderChecklists,
  listChecklistItems,
} from "./services/listWorkOrderChecklists";
export { createWorkOrderChecklist } from "./services/createWorkOrderChecklist";
export type {
  CreateWorkOrderChecklistInput,
  CreateWorkOrderChecklistResult,
} from "./services/createWorkOrderChecklist";
export {
  updateChecklistItem,
  completeChecklistItem,
  completeChecklist,
} from "./services/updateChecklistItem";
export type { UpdateChecklistItemPatch } from "./services/updateChecklistItem";

// BUSINESS-CORE-4 — shared lib helpers
export * from "./lib/statusHelpers";
export * from "./lib/source";
export * from "./lib/kpis";
export * from "./lib/useAssigneeNames";
// BUSINESS-WORKFLOW-2 — display-only SLA helpers
export * from "./lib/sla";
// BUSINESS-WORKFLOW-7 — Production board rules + listing
export * from "./lib/pipelineRules";
// BUSINESS-WORKFLOW-PRODUCTION-2 — WIP limits, capacity metrics, safe error mapping
export * from "./lib/wipLimits";
export * from "./lib/boardCapacity";
export * from "./lib/transitionErrors";
export { listWorkOrdersForBoard } from "./services/listWorkOrdersForBoard";
export type {
  ListWorkOrdersForBoardOptions,
  ListWorkOrdersForBoardResult,
  BoardWorkOrderRow,
  BoardAssignmentRow,
  BoardQuotationSummary,
  BoardChecklistSummary,
} from "./services/listWorkOrdersForBoard";