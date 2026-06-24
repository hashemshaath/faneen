/**
 * CONTRACT PARTY MODEL — PHASE F
 *
 * Pure helper that builds a uniform contract summary for the post-creation
 * draft view, regardless of which surface (dashboard, workspace, site or
 * project) created the contract. No network, no mutation, no lifecycle
 * change — purely a presentation aid that consolidates the fields already
 * persisted on the row + already known at the call-site.
 */

export type ContractCreationSource =
  | 'dashboard'
  | 'workspace'
  | 'site'
  | 'project'
  | 'opportunity'
  | 'unknown';

export interface ContractSummaryInput {
  readonly title?: string | null;
  readonly status?: string | null;
  readonly firstPartyDisplayName?: string | null;
  readonly secondPartyDisplayName?: string | null;
  readonly executionSiteLabel?: string | null;
  readonly sectorLabel?: string | null;
  readonly templateLabel?: string | null;
  readonly lineItemsCount?: number | null;
  readonly hasWarranty?: boolean | null;
  readonly hasPayments?: boolean | null;
  readonly source?: ContractCreationSource | null;
}

export interface ContractSummary {
  readonly title: string | null;
  readonly status: string;
  readonly firstPartyDisplayName: string | null;
  readonly secondPartyDisplayName: string | null;
  readonly executionSiteLabel: string | null;
  readonly sectorLabel: string | null;
  readonly templateLabel: string | null;
  readonly lineItemsCount: number;
  readonly hasWarranty: boolean;
  readonly hasPayments: boolean;
  readonly source: ContractCreationSource;
  readonly isDraft: boolean;
}

/**
 * Build a normalized summary. Defaults to `draft` lifecycle and `unknown`
 * source so callers cannot accidentally surface a non-draft state from this
 * helper. The Phase F contract is: creation always yields a draft.
 */
export function buildContractSummary(
  input: ContractSummaryInput,
): ContractSummary {
  const status = (input.status ?? 'draft').trim() || 'draft';
  return {
    title: input.title ?? null,
    status,
    firstPartyDisplayName: input.firstPartyDisplayName ?? null,
    secondPartyDisplayName: input.secondPartyDisplayName ?? null,
    executionSiteLabel: input.executionSiteLabel ?? null,
    sectorLabel: input.sectorLabel ?? null,
    templateLabel: input.templateLabel ?? null,
    lineItemsCount: Math.max(0, Number(input.lineItemsCount ?? 0) || 0),
    hasWarranty: !!input.hasWarranty,
    hasPayments: !!input.hasPayments,
    source: input.source ?? 'unknown',
    isDraft: status === 'draft',
  };
}
