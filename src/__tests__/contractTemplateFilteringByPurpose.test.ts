/**
 * CONTRACT CREATION PURPOSE-FIRST FLOW — filterContractTemplates
 * filtering and ranking invariants.
 */
import { describe, it, expect } from 'vitest';
import { filterContractTemplates, type FilterableContractTemplate } from '@/modules/contracts/services/filterContractTemplates';

const tpl = (over: Partial<FilterableContractTemplate>): FilterableContractTemplate => ({
  id: over.id ?? 't',
  isPublished: true,
  isActive: true,
  ...over,
});

describe('filterContractTemplates', () => {
  it('1) returns templates matching sector', () => {
    const r = filterContractTemplates([tpl({ id: 'a', sectorId: 's1' })], { sectorId: 's1' });
    expect(r.specialized.map(s => s.template.id)).toEqual(['a']);
    expect(r.specialized[0]?.matchReason).toBe('sector');
  });
  it('2) returns templates matching serviceType', () => {
    const r = filterContractTemplates([tpl({ id: 'a', serviceTypeId: 'sv1' })], { serviceTypeId: 'sv1' });
    expect(r.specialized[0]?.matchReason).toBe('serviceType');
  });
  it('3) excludes unpublished and inactive templates', () => {
    const r = filterContractTemplates([
      tpl({ id: 'pub', sectorId: 's1' }),
      tpl({ id: 'unpub', sectorId: 's1', isPublished: false }),
      tpl({ id: 'inact', sectorId: 's1', isActive: false }),
      tpl({ id: 'gen-unpub', isGeneral: true, isPublished: false }),
    ], { sectorId: 's1' });
    expect(r.specialized.map(s => s.template.id)).toEqual(['pub']);
    expect(r.general).toEqual([]);
  });
  it('4) sorts sector match before serviceType before purpose', () => {
    const r = filterContractTemplates([
      tpl({ id: 'purp', purposeId: 'p1' }),
      tpl({ id: 'svc', serviceTypeId: 'sv1' }),
      tpl({ id: 'sec', sectorId: 's1' }),
    ], { sectorId: 's1', serviceTypeId: 'sv1', purposeId: 'p1' });
    expect(r.specialized.map(s => s.template.id)).toEqual(['sec', 'svc', 'purp']);
  });
  it('5) returns general fallback when no specialized exists', () => {
    const r = filterContractTemplates([tpl({ id: 'g', isGeneral: true })], { sectorId: 's1' });
    expect(r.hasSpecialized).toBe(false);
    expect(r.general.map(g => g.template.id)).toEqual(['g']);
  });
  it('6) keeps general as a clearly separate option when specialized exists', () => {
    const r = filterContractTemplates([
      tpl({ id: 'g', isGeneral: true }),
      tpl({ id: 's', sectorId: 's1' }),
    ], { sectorId: 's1' });
    expect(r.hasSpecialized).toBe(true);
    expect(r.specialized.map(s => s.template.id)).toEqual(['s']);
    expect(r.general.map(g => g.template.id)).toEqual(['g']);
  });
});