/**
 * BUSINESS-OPERATIONS-INTELLIGENCE-1 — Allow-list of customer-visible
 * project events. Any event not present here MUST NOT trigger a customer
 * notification or email.
 *
 * Pure module — no Supabase, no side effects, safe to import from tests.
 */

export const CUSTOMER_PROJECT_EVENT_TYPES = [
  // Quotation
  'quotation.sent',
  'quotation.viewed',
  'quotation.approved',
  'quotation.rejected',
  'quotation.expiring_soon',
  // Contract
  'contract.draft_created',
  'contract.sent',
  'contract.signed',
  'contract.activated',
  // Work Order
  'work_order.created',
  'work_order.measurements_started',
  'work_order.measurements_completed',
  'work_order.production_started',
  'work_order.qc_started',
  'work_order.ready_for_installation',
  'work_order.installation_scheduled',
  'work_order.completed',
  // Installation appointments
  'installation.scheduled',
  'installation.confirmed',
  'installation.reschedule_requested',
  'installation.completed',
  // Project closure / feedback / warranty
  'project.completed',
  'project.confirmed',
  'feedback.received',
  'warranty.started',
  // Attachments — only when explicitly customer-visible
  'customer_visible_attachment_added',
] as const;

export type CustomerProjectEventType =
  (typeof CUSTOMER_PROJECT_EVENT_TYPES)[number];

/**
 * Subset of events that are currently safe to wire into the dispatcher.
 * Everything else is intentionally deferred until the corresponding
 * email template, customer portal, and consent flow are in place.
 */
export const WIRED_CUSTOMER_PROJECT_EVENT_TYPES = [
  'quotation.sent',
  'quotation.approved',
  'work_order.created',
  'work_order.completed',
  'installation.scheduled',
  'installation.confirmed',
  'installation.reschedule_requested',
  'installation.completed',
  // Low-risk customer-facing closure events. `feedback.received` is
  // intentionally NOT wired to a customer email (kept internal-only).
  'project.completed',
  'project.confirmed',
  'warranty.started',
] as const satisfies ReadonlyArray<CustomerProjectEventType>;

export type WiredCustomerProjectEventType =
  (typeof WIRED_CUSTOMER_PROJECT_EVENT_TYPES)[number];

export function isCustomerProjectEventType(
  value: string,
): value is CustomerProjectEventType {
  return (CUSTOMER_PROJECT_EVENT_TYPES as ReadonlyArray<string>).includes(value);
}

export function isWiredCustomerProjectEventType(
  value: string,
): value is WiredCustomerProjectEventType {
  return (WIRED_CUSTOMER_PROJECT_EVENT_TYPES as ReadonlyArray<string>).includes(
    value,
  );
}

/**
 * Fields that MUST NEVER appear in customer-facing notification copy or
 * email templates. Used by tests to scan templates and copy modules.
 */
export const FORBIDDEN_CUSTOMER_FIELDS = [
  'internal_note',
  'internal_notes',
  'supplier_quote',
  'supplier_price',
  'staff_assignment',
  'audit_metadata',
  'sla_event',
] as const;