/**
 * CONTRACT CREATION PURPOSE-FIRST FLOW
 *
 * Pure helper that resolves the "purpose" of a contract — i.e. the
 * sector / service-type / activity bundle the rest of the wizard
 * (party filtering, template filtering, BOQ defaults) depends on.
 *
 * Precedence is deterministic and identical to resolveContractActivity:
 *
 *   1. project       (contract created from a linked project)
 *   2. quote         (contract created from a quote request / opportunity)
 *   3. business      (provider account primary activity)
 *   4. manual        (user-picked from the approved taxonomy)
 *
 * Returns `source: null` when nothing is known — callers MUST surface
 * a manual purpose picker in that case and never fall back to a
 * hardcoded default.
 */
import {
  resolveContractActivity,
  type ContractActivitySource,
} from './resolveContractActivity';

export type ContractPurposeSource = ContractActivitySource;

export interface ResolveContractPurposeInput {
  project?: { categoryId?: string | null; sectorId?: string | null; serviceTypeId?: string | null; labelAr?: string | null; labelEn?: string | null } | null;
  quote?: { categoryId?: string | null; sectorId?: string | null; serviceTypeId?: string | null; labelAr?: string | null; labelEn?: string | null } | null;
  business?: { categoryId?: string | null; sectorId?: string | null; serviceTypeId?: string | null; labelAr?: string | null; labelEn?: string | null } | null;
  manual?: { categoryId?: string | null; sectorId?: string | null; serviceTypeId?: string | null; labelAr?: string | null; labelEn?: string | null } | null;
}

export interface ResolvedContractPurpose {
  purposeId: string | null;
  purposeLabelAr: string | null;
  purposeLabelEn: string | null;
  source: ContractPurposeSource;
  sectorId: string | null;
  serviceTypeId: string | null;
  isManual: boolean;
  /** 1 = strongest (project), 0 = unknown. */
  confidence: number;
}

const CONFIDENCE: Record<Exclude<ContractPurposeSource, null>, number> = {
  project: 1,
  quote: 0.85,
  business: 0.6,
  manual: 0.4,
};

const trim = (v?: string | null): string => (v ?? '').trim();

export function resolveContractPurpose(input: ResolveContractPurposeInput): ResolvedContractPurpose {
  const { activityId, source } = resolveContractActivity({
    projectCategoryId: input.project?.categoryId ?? null,
    quoteRequestCategoryId: input.quote?.categoryId ?? null,
    businessPrimaryCategoryId: input.business?.categoryId ?? null,
    manualCategoryId: input.manual?.categoryId ?? null,
  });

  if (!source) {
    return {
      purposeId: null,
      purposeLabelAr: null,
      purposeLabelEn: null,
      source: null,
      sectorId: null,
      serviceTypeId: null,
      isManual: false,
      confidence: 0,
    };
  }

  const winner =
    source === 'project' ? input.project :
    source === 'quote' ? input.quote :
    source === 'business' ? input.business :
    input.manual;

  return {
    purposeId: activityId,
    purposeLabelAr: trim(winner?.labelAr) || null,
    purposeLabelEn: trim(winner?.labelEn) || null,
    source,
    sectorId: trim(winner?.sectorId) || null,
    serviceTypeId: trim(winner?.serviceTypeId) || null,
    isManual: source === 'manual',
    confidence: CONFIDENCE[source],
  };
}

export default resolveContractPurpose;