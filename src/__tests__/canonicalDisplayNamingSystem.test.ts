/**
 * CANONICAL DISPLAY NAMING SYSTEM — extended helper guards.
 *
 * Verifies that the central display helpers cover contracts and
 * requests in addition to sites/projects, never echo UUIDs as titles,
 * and surface IDs only via the small `formatEntityReference` chip.
 */
import { describe, it, expect } from 'vitest';
import {
  formatSiteTitle,
  formatSiteSubtitle,
  formatProjectTitle,
  formatProjectSubtitle,
  formatContractTitle,
  formatContractSubtitle,
  formatRequestTitle,
  formatEntityReference,
  shortReferenceId,
  isUuidLike,
} from '@/lib/workspace/displayNames';

const UUID = '7542dd9b-567d-4522-a612-321662174b9e';

describe('site subtitle', () => {
  it('joins city — district when both exist', () => {
    expect(formatSiteSubtitle({ city_name: 'جدة', district: 'النعيم' }, true))
      .toBe('جدة — النعيم');
  });
  it('falls back to address, then localized generic', () => {
    expect(formatSiteSubtitle({ address_line1: 'شارع 5' }, true)).toBe('شارع 5');
    expect(formatSiteSubtitle({}, true)).toBe('موقع تنفيذ');
    expect(formatSiteSubtitle({}, false)).toBe('Execution site');
  });
  it('never returns a UUID', () => {
    expect(formatSiteSubtitle({ city_name: UUID }, true)).toBe('موقع تنفيذ');
  });
});

describe('project subtitle', () => {
  it('prefers linked site name, then city, then generic', () => {
    expect(formatProjectSubtitle({}, { site_name: 'موقع جدة' }, true))
      .toBe('موقع جدة');
    expect(formatProjectSubtitle({}, { city_name: 'الدمام' }, true))
      .toBe('الدمام');
    expect(formatProjectSubtitle({}, null, true)).toBe('مشروع');
  });
});

describe('contract title', () => {
  it('uses title, then contract_number, then reference_number', () => {
    expect(formatContractTitle({ title: 'عقد واجهات' }, null, true)).toBe('عقد واجهات');
    expect(formatContractTitle({ contract_number: 'C-2025-001' }, null, true))
      .toBe('C-2025-001');
    expect(formatContractTitle({ reference_number: 'R-9' }, null, true)).toBe('R-9');
  });
  it('falls back to project, then site, then unnamed', () => {
    expect(formatContractTitle({}, { projectTitle: 'تركيب' }, true))
      .toBe('عقد تركيب');
    expect(formatContractTitle({}, { siteTitle: 'موقع جدة' }, true))
      .toBe('عقد مرتبط بـ موقع جدة');
    expect(formatContractTitle({}, null, true)).toBe('عقد غير مسمى');
    expect(formatContractTitle({}, null, false)).toBe('Untitled contract');
  });
  it('never returns a UUID as title', () => {
    expect(formatContractTitle({ title: UUID, contract_number: UUID }, null, true))
      .toBe('عقد غير مسمى');
  });
});

describe('contract subtitle', () => {
  it('prefers site then project then ref then generic', () => {
    expect(formatContractSubtitle(null, { siteTitle: 'A' }, true)).toBe('A');
    expect(formatContractSubtitle(null, { projectTitle: 'P' }, true)).toBe('P');
    expect(formatContractSubtitle({ reference_number: 'R-1' }, null, true)).toBe('R-1');
    expect(formatContractSubtitle(null, null, false)).toBe('Contract');
  });
});

describe('request title', () => {
  it('prefers title, then reference, then service/category, then site', () => {
    expect(formatRequestTitle({ title: 'طلب صيانة' }, null, true)).toBe('طلب صيانة');
    expect(formatRequestTitle({ reference_number: 'RQ-9' }, null, true)).toBe('RQ-9');
    expect(formatRequestTitle({ service_name: 'ألمنيوم' }, null, true))
      .toBe('طلب ألمنيوم');
    expect(formatRequestTitle({}, { siteTitle: 'موقع جدة' }, true))
      .toBe('طلب مرتبط بـ موقع جدة');
    expect(formatRequestTitle({}, null, true)).toBe('طلب غير مسمى');
  });
  it('never returns a UUID', () => {
    expect(formatRequestTitle({ title: UUID, reference_number: UUID }, null, true))
      .toBe('طلب غير مسمى');
  });
});

describe('formatEntityReference', () => {
  it('returns "مرجع: xxxxxxxx" in RTL, "Ref: xxxxxxxx" in LTR', () => {
    expect(formatEntityReference(UUID, true)).toBe('مرجع: 7542dd9b');
    expect(formatEntityReference(UUID, false)).toBe('Ref: 7542dd9b');
  });
  it('is empty for missing input', () => {
    expect(formatEntityReference(null)).toBe('');
    expect(formatEntityReference('')).toBe('');
  });
  it('never returns the full UUID', () => {
    const out = formatEntityReference(UUID, true);
    expect(out).not.toContain(UUID);
    expect(out.length).toBeLessThan(UUID.length);
  });
});

describe('contract — breadcrumb safety', () => {
  it('site/project/contract titles never expose a full UUID', () => {
    const outputs = [
      formatSiteTitle({ site_name: UUID, city_name: UUID }, true),
      formatProjectTitle({ title_ar: UUID }, { site_name: UUID }, true),
      formatContractTitle({ title: UUID, contract_number: UUID }, { siteTitle: UUID }, true),
      formatRequestTitle({ title: UUID }, { siteTitle: UUID }, true),
    ];
    for (const out of outputs) {
      expect(out).not.toContain(UUID);
      expect(isUuidLike(out)).toBe(false);
    }
  });
  it('shortReferenceId always yields 8 chars max', () => {
    expect(shortReferenceId(UUID)).toHaveLength(8);
  });
});