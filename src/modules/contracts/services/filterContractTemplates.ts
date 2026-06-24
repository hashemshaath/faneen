/**
 * CONTRACT CREATION PURPOSE-FIRST FLOW
 *
 * Pure helper that filters and ranks contract templates against the
 * resolved contract purpose (sector / service-type / activity).
 *
 * Rules (per spec):
 *  1. Drop anything that is not published AND active.
 *  2. A template is "specialized" when it matches by sectorId OR
 *     serviceTypeId OR purposeId.
 *  3. A template is "general" only when explicitly flagged
 *     (`isGeneral === true`).
 *  4. Specialized templates are returned first; the general template
 *     is offered as a fallback option (always last in `general`).
 *  5. Each returned template carries a `matchReason` explaining why
 *     it was matched (`sector` | `serviceType` | `purpose` | `general`).
 */

export interface FilterableContractTemplate {
  id: string;
  sectorId?: string | null;
  serviceTypeId?: string | null;
  purposeId?: string | null;
  isPublished?: boolean;
  isActive?: boolean;
  isGeneral?: boolean;
}

export type TemplateMatchReason = 'sector' | 'serviceType' | 'purpose' | 'general';

export interface RankedContractTemplate<T extends FilterableContractTemplate> {
  template: T;
  matchReason: TemplateMatchReason;
  isGeneral: boolean;
}

export interface FilterContractTemplatesContext {
  sectorId?: string | null;
  serviceTypeId?: string | null;
  purposeId?: string | null;
}

export interface FilteredContractTemplates<T extends FilterableContractTemplate> {
  specialized: RankedContractTemplate<T>[];
  general: RankedContractTemplate<T>[];
  hasSpecialized: boolean;
}

const eq = (a?: string | null, b?: string | null): boolean => {
  const aa = (a ?? '').trim();
  const bb = (b ?? '').trim();
  return aa.length > 0 && aa === bb;
};

export function filterContractTemplates<T extends FilterableContractTemplate>(
  templates: readonly T[],
  ctx: FilterContractTemplatesContext,
): FilteredContractTemplates<T> {
  const specialized: RankedContractTemplate<T>[] = [];
  const general: RankedContractTemplate<T>[] = [];

  for (const tpl of templates) {
    if (tpl.isPublished === false) continue;
    if (tpl.isActive === false) continue;

    if (tpl.isGeneral === true) {
      general.push({ template: tpl, matchReason: 'general', isGeneral: true });
      continue;
    }

    let reason: TemplateMatchReason | null = null;
    if (eq(tpl.sectorId, ctx.sectorId)) reason = 'sector';
    else if (eq(tpl.serviceTypeId, ctx.serviceTypeId)) reason = 'serviceType';
    else if (eq(tpl.purposeId, ctx.purposeId)) reason = 'purpose';

    if (reason) specialized.push({ template: tpl, matchReason: reason, isGeneral: false });
  }

  // Stable ordering: sector first, then serviceType, then purpose.
  const weight: Record<TemplateMatchReason, number> = { sector: 0, serviceType: 1, purpose: 2, general: 3 };
  specialized.sort((a, b) => weight[a.matchReason] - weight[b.matchReason]);

  return { specialized, general, hasSpecialized: specialized.length > 0 };
}

export default filterContractTemplates;