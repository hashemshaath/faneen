/**
 * BUSINESS-WORKFLOW-PROCUREMENT-1 — Procurement module barrel.
 *
 * Pages and components MUST import from this barrel and MUST NOT call
 * `supabase.from('procurement_*')` directly. Enforced by
 * `scripts/procurement-isolation-audit.mjs`.
 */
export * from './types';
export {
  createProcurementRequest,
  listProcurementRequests,
  getProcurementRequestById,
  updateProcurementRequestStatus,
} from './services/procurementRequests';
export type {
  CreateProcurementRequestInput,
  ListProcurementRequestsOptions,
  UpdateProcurementRequestStatusInput,
} from './services/procurementRequests';
export {
  createRfqFromRequest,
  listRfqs,
  getRfqById,
  updateRfqStatus,
  sendRfq,
  closeRfq,
  awardRfqQuote,
} from './services/rfqs';
export type { CreateRfqInput, ListRfqsOptions } from './services/rfqs';
export {
  createSupplier,
  listSuppliers,
  updateSupplierStatus,
} from './services/suppliers';
export type {
  CreateSupplierInput,
  ListSuppliersOptions,
} from './services/suppliers';
export {
  submitSupplierQuote,
  listSupplierQuotesByRfq,
  awardSupplierQuote,
  shortlistQuote,
  rejectQuote,
} from './services/supplierQuotes';
export type {
  SubmitSupplierQuoteInput,
  AwardSupplierQuoteResult,
} from './services/supplierQuotes';
export { compareSupplierQuotes } from './services/quoteComparison';
export type { ScoredQuote } from './services/quoteComparison';
export {
  listInvitationsByRfq,
  inviteSuppliersToRfq,
  markInvitationResponded,
} from './services/invitations';
export type { InviteSuppliersInput } from './services/invitations';
export { evaluateAwardEligibility } from './services/awardEligibility';
export type {
  AwardEligibility,
  AwardRejectionReason,
} from './services/awardEligibility';
// BUSINESS-WORKFLOW-PROCUREMENT-3 — RFQ line items
export {
  createRfqItem,
  updateRfqItem,
  deleteRfqItem,
  listRfqItemsByRfq,
  reorderRfqItems,
} from './services/rfqItems';
export type {
  CreateRfqItemInput,
  UpdateRfqItemPatch,
  ReorderRfqItemEntry,
} from './services/rfqItems';
// BUSINESS-WORKFLOW-PROCUREMENT-3 — Supplier quote line items
export {
  submitQuoteItems,
  listQuoteItemsByQuote,
  listQuoteItemsByRfq,
  calculateLineTotal,
} from './services/supplierQuoteItems';
export type { SubmitQuoteItemInput } from './services/supplierQuoteItems';
// BUSINESS-WORKFLOW-PROCUREMENT-3 — Line-item-aware comparison
export {
  compareQuotesWithLineItems,
  calculateQuoteTotals,
} from './services/quoteComparisonLineItems';
export type {
  QuoteComparisonInput,
  QuoteComparisonResult,
  LineItemRecommendationReason,
} from './services/quoteComparisonLineItems';
// BUSINESS-WORKFLOW-PROCUREMENT-3 — Notifications
export {
  notifyProcurementEvent,
} from './services/procurementNotifications';
export type {
  ProcurementNotificationEvent,
  ProcurementNotificationInput,
} from './services/procurementNotifications';
// BUSINESS-WORKFLOW-PROCUREMENT-3 — Award pipeline handoff
export { executeAwardHandoff } from './services/awardHandoff';
export type { AwardHandoffInput } from './services/awardHandoff';