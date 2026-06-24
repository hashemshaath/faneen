/**
 * CONTRACT CREATION PURPOSE-FIRST FLOW — resolveContractPurpose
 * precedence and no-hardcoded-default invariants.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { resolveContractPurpose } from '@/modules/contracts/services/resolveContractPurpose';

const HELPER = readFileSync(resolve('src/modules/contracts/services/resolveContractPurpose.ts'), 'utf8');
const PAGE = readFileSync(resolve('src/pages/dashboard/DashboardContracts.tsx'), 'utf8');

describe('resolveContractPurpose — source precedence', () => {
  const make = (over: Record<string, unknown> = {}) => ({
    project: { categoryId: 'p', sectorId: 'sp', serviceTypeId: 'svp', labelAr: 'مشروع', labelEn: 'Project' },
    quote: { categoryId: 'q', sectorId: 'sq', serviceTypeId: 'svq', labelAr: 'فرصة', labelEn: 'Quote' },
    business: { categoryId: 'b', sectorId: 'sb', serviceTypeId: 'svb', labelAr: 'منشأة', labelEn: 'Business' },
    manual: { categoryId: 'm', sectorId: 'sm', serviceTypeId: 'svm', labelAr: 'يدوي', labelEn: 'Manual' },
    ...over,
  });

  it('1) project source wins over everything', () => {
    const r = resolveContractPurpose(make());
    expect(r.source).toBe('project');
    expect(r.purposeId).toBe('p');
    expect(r.sectorId).toBe('sp');
    expect(r.confidence).toBe(1);
    expect(r.isManual).toBe(false);
  });
  it('2) quote/opportunity source comes after project', () => {
    const r = resolveContractPurpose(make({ project: null }));
    expect(r.source).toBe('quote');
    expect(r.purposeId).toBe('q');
  });
  it('3) business source comes after quote', () => {
    const r = resolveContractPurpose(make({ project: null, quote: null }));
    expect(r.source).toBe('business');
    expect(r.purposeId).toBe('b');
  });
  it('4) manual appears only when no other source is available', () => {
    const r = resolveContractPurpose(make({ project: null, quote: null, business: null }));
    expect(r.source).toBe('manual');
    expect(r.isManual).toBe(true);
  });
  it('5) no hardcoded default — returns null source when nothing is known', () => {
    expect(resolveContractPurpose({})).toEqual({
      purposeId: null, purposeLabelAr: null, purposeLabelEn: null,
      source: null, sectorId: null, serviceTypeId: null, isManual: false, confidence: 0,
    });
    expect(HELPER).not.toMatch(/\b(electrical|plumbing|construction|hvac|aluminum|maintenance)\b/i);
    expect(HELPER).not.toMatch(/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/);
  });
  it('6) source is exposed in the resolved object so UI can render a badge', () => {
    const r = resolveContractPurpose(make({ project: null, quote: null }));
    expect(['project', 'quote', 'business', 'manual']).toContain(r.source);
    // sanity: helper file is wired by the contracts page (sector/service-type live in the wizard surface)
    expect(PAGE).toMatch(/WorkTypeSection\b/);
  });
  it('no any / suppressions', () => {
    expect(HELPER).not.toMatch(/:\s*any\b/);
    expect(HELPER).not.toMatch(/\bas\s+any\b/);
    expect(HELPER).not.toMatch(/@ts-ignore|eslint-disable/);
  });
});