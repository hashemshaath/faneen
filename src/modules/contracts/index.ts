/**
 * Module: contracts
 *
 * R2A.1 — Pure foundation. Exposes the pure (no-DB) contract helpers via
 * the new module path. Canonical implementations still live in src/lib
 * during this phase; later R2A waves will migrate IO-bearing services
 * (list, detail, mutations, amendments, invitations, attachments, pdf).
 *
 * Existing imports from '@/lib/contract-*' continue to work unchanged.
 */
export * from './constants/statuses';
export * from './constants/workTypes';
export * from './services/financials';
export * from './services/pricing';
export * from './services/completeness';
export * from './services/timeline';
export * from './services/errors';
export * from './services/list';
export * from './services/aggregates';
export * from './services/mutations';
export * from './services/amendments';
export * from './services/invitations';
export * from './services/pdfHistory';
export * from './services/pdf';
// EF-2 edge function wrappers
export * from './services/notifications';
export * from './services/pdf/verifyPdfArabic';
// L-4 lead RPC wrappers
export * from './services/leadRpcs';
// CT-2 runtime read wrappers
export * from './services/reads';
// CT-3 runtime mutation/RPC wrappers
export * from './services/updateContractById';
export * from './services/createContractFromTemplate';
export * from './services/updateContractDraftAutosave';
export * from './services/emitContractAudit';
export * from './services/searchContractClients';
export * from './services/quickResolveContractClient';
export * from './services/listClientSitesForContract';
export * from './services/verifyContractPublic';
export * from './services/pdfExports';
// CT-4 child-table wrappers (milestones, notes, measurements, attachments, installments)
export * from './services/childTables';
// CT-5 contract template admin/editor wrappers
export * from './services/templates';
// CT-7 contract runtime attachment storage wrappers + bucket constant
export * from './services/attachments';
// CT-9 contract runtime installment plan/payment wrappers
export * from './services/installments';
// CT-11 contract analytics RPC wrappers
export * from './services/analytics';
// WRAPPER-ISOLATION-BACKLOG-1: edge function wrapper
export { analyzeContractDocument } from './services/analyzeContractDocument';
// BUSINESS-ADMIN-4: admin-safe enrichment wrapper for CNT refs
export { getAdminContractSummaryByRef } from './services/getAdminContractSummaryByRef';
export type { AdminContractSummary } from './services/getAdminContractSummaryByRef';
// types.ts is available at '@/modules/contracts/types' for consumers that
// want type-only imports. Not re-exported here to avoid duplicate type
// re-exports (all types are already reachable via the value exports above).