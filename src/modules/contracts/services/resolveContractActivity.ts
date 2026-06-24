/**
 * Phase H — resolveContractActivity
 *
 * Pure helper that resolves the contract activity (sector / work
 * type / taxonomy category) from the available signals, with a
 * deterministic precedence:
 *
 *   1. project category (when contract created from a project)
 *   2. quote request category (when created from a lead)
 *   3. business primary activity (provider account)
 *   4. manual selection (user-picked from the approved taxonomy list)
 *
 * Returns `{ activityId: null, source: null }` when none of the
 * above is available — callers are expected to surface a manual
 * activity picker in that case (never a hardcoded default).
 */

export type ContractActivitySource = 'project' | 'quote' | 'business' | 'manual' | null;

export interface ResolveContractActivityInput {
  projectCategoryId?: string | null;
  quoteRequestCategoryId?: string | null;
  businessPrimaryCategoryId?: string | null;
  manualCategoryId?: string | null;
}

export interface ResolvedContractActivity {
  activityId: string | null;
  source: ContractActivitySource;
}

export function resolveContractActivity(input: ResolveContractActivityInput): ResolvedContractActivity {
  const proj = (input.projectCategoryId ?? '').trim();
  if (proj) return { activityId: proj, source: 'project' };
  const quote = (input.quoteRequestCategoryId ?? '').trim();
  if (quote) return { activityId: quote, source: 'quote' };
  const biz = (input.businessPrimaryCategoryId ?? '').trim();
  if (biz) return { activityId: biz, source: 'business' };
  const manual = (input.manualCategoryId ?? '').trim();
  if (manual) return { activityId: manual, source: 'manual' };
  return { activityId: null, source: null };
}

export default resolveContractActivity;