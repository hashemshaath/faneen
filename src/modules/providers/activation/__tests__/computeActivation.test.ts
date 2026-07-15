import { describe, it, expect } from 'vitest';
import { computeProviderActivation } from '../computeActivation';

const base = {
  approvalStatus: 'draft',
  coverageCount: 0,
  primaryActivityCount: 0,
  activeServicesCount: 0,
  logoUrl: null,
  descriptionAr: null,
  descriptionEn: null,
};

describe('computeProviderActivation', () => {
  it('none done', () => {
    const r = computeProviderActivation(base);
    expect(r.completedCount).toBe(0);
    expect(r.percent).toBe(0);
    expect(r.isFullyActive).toBe(false);
    expect(r.steps.find((s) => s.key === 'coverage_set')?.hintAr).toContain('تغطية');
  });

  it('partial (approved + coverage only)', () => {
    const r = computeProviderActivation({
      ...base,
      approvalStatus: 'published',
      coverageCount: 1,
    });
    expect(r.completedCount).toBe(2);
    expect(r.percent).toBe(40);
    expect(r.isFullyActive).toBe(false);
    expect(r.steps.find((s) => s.key === 'business_approved')?.done).toBe(true);
    expect(r.steps.find((s) => s.key === 'has_service')?.done).toBe(false);
  });

  it('activity_taxonomy step mirrors matcher (business_taxonomy_categories primary_activity)', () => {
    const r = computeProviderActivation({
      ...base,
      approvalStatus: 'approved',
      coverageCount: 1,
      activeServicesCount: 3,
      primaryActivityCount: 0,
    });
    const tax = r.steps.find((s) => s.key === 'activity_taxonomy')!;
    expect(tax.done).toBe(false);
    expect(tax.hintEn).toContain('primary business activity');
    // Flipping the count to ≥1 (matcher's requirement) marks the step done.
    const r2 = computeProviderActivation({
      ...base,
      approvalStatus: 'approved',
      coverageCount: 1,
      activeServicesCount: 3,
      primaryActivityCount: 1,
    });
    expect(r2.steps.find((s) => s.key === 'activity_taxonomy')?.done).toBe(true);
  });

  it('all done → isFullyActive', () => {
    const r = computeProviderActivation({
      approvalStatus: 'approved',
      coverageCount: 1,
      primaryActivityCount: 1,
      activeServicesCount: 3,
      logoUrl: 'https://x/logo.png',
      descriptionAr: 'وصف كافٍ للنشاط التجاري المتخصص',
      descriptionEn: null,
    });
    expect(r.completedCount).toBe(5);
    expect(r.percent).toBe(100);
    expect(r.isFullyActive).toBe(true);
  });

  it('short description fails profile_basics', () => {
    const r = computeProviderActivation({
      ...base,
      approvalStatus: 'approved',
      logoUrl: 'x',
      descriptionAr: 'قصير',
    });
    expect(r.steps.find((s) => s.key === 'profile_basics')?.done).toBe(false);
  });
});