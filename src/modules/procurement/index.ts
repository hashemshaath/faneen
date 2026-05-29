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
} from './services/supplierQuotes';
export type {
  SubmitSupplierQuoteInput,
  AwardSupplierQuoteResult,
} from './services/supplierQuotes';
export { compareSupplierQuotes } from './services/quoteComparison';
export type { ScoredQuote } from './services/quoteComparison';