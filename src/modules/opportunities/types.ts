/**
 * OPPORTUNITIES PHASE 3 — domain types.
 *
 * UI-only aliases over the existing tables. The underlying rows are
 * still `quote_requests` and `quote_request_leads`. No DB rename.
 *
 *   Opportunity            ⇄ quote_requests row
 *   OpportunityAssignment  ⇄ quote_request_leads row
 *
 * `provider_leads` is a separate CRM enrichment table and is NEVER
 * surfaced as an «Opportunity Assignment» in this module.
 */
import type { MyQuoteRequestRow, ProviderLeadRow } from '@/modules/leads/services/list';

export type Opportunity = MyQuoteRequestRow;
export type OpportunityAssignment = ProviderLeadRow;

/** Internal-table → UI-domain marker, kept for documentation + tests. */
export const OPPORTUNITY_SOURCE_TABLES = {
  opportunity: 'quote_requests',
  assignment: 'quote_request_leads',
} as const;

/** Tables that must NEVER back an OpportunityAssignment in the UI. */
export const NON_OPPORTUNITY_TABLES = ['provider_leads'] as const;