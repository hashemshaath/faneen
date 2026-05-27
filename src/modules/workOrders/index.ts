/**
 * BUSINESS-CORE-3A — Work Orders module barrel.
 * All UI/pages MUST import from this module — never reach into
 * `supabase.from('work_orders'|'work_order_stages'|'work_order_tasks'|'work_order_comments')` directly.
 */
export * from "./types";
export { listWorkOrdersForBusiness } from "./services/listWorkOrdersForBusiness";
export { getWorkOrderById } from "./services/getWorkOrderById";
export { createWorkOrder } from "./services/createWorkOrder";
export { updateWorkOrder } from "./services/updateWorkOrder";
export { recordWorkOrderAudit } from "./services/recordWorkOrderAudit";