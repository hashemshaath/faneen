/**
 * OPPORTUNITIES PHASE 3 — repository facade.
 *
 * Thin re-exports over the existing `@/modules/leads/services/list` layer.
 * NO new DB queries, NO new RPCs, NO new edge calls. The adapter exists
 * purely to give the UI an opportunity-flavored entry point while the
 * underlying tables (`quote_requests`, `quote_request_leads`) stay
 * untouched.
 *
 * `provider_leads` is intentionally NOT exposed here — it is CRM
 * enrichment data, not an opportunity assignment.
 */
import {
  listMyQuoteRequests,
  listProviderLeads,
  countQuoteRequestFiles,
} from '@/modules/leads/services/list';
import type { Opportunity, OpportunityAssignment } from './types';

export async function listMyOpportunities(userId: string): Promise<Opportunity[]> {
  return listMyQuoteRequests(userId);
}

export async function listAssignedOpportunities(limit = 100): Promise<OpportunityAssignment[]> {
  return listProviderLeads(limit);
}

export async function countOpportunityFiles(
  opportunityIds: string[],
): Promise<Map<string, number>> {
  return countQuoteRequestFiles(opportunityIds);
}