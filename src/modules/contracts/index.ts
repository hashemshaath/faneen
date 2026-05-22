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
// types.ts is available at '@/modules/contracts/types' for consumers that
// want type-only imports. Not re-exported here to avoid duplicate type
// re-exports (all types are already reachable via the value exports above).