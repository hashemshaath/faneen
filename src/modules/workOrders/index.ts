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

// BUSINESS-CORE-4 — shared lib helpers
export * from "./lib/statusHelpers";
export * from "./lib/source";
export * from "./lib/kpis";
export * from "./lib/useAssigneeNames";