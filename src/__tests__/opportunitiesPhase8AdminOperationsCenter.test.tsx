import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(__dirname, '..', '..');
const PAGE = readFileSync(
  resolve(ROOT, 'src/pages/admin/AdminOpportunitiesOperations.tsx'),
  'utf8',
);
const APP = readFileSync(resolve(ROOT, 'src/App.tsx'), 'utf8');

describe('Opportunities Phase 8 — admin operations center page', () => {
  it('1. /admin/opportunities routes to AdminOpportunitiesOperations', () => {
    expect(APP).toMatch(/path="\/admin\/opportunities"[\s\S]{0,200}<AdminOpportunitiesOperations/);
  });
  it('2. renders the KPI tiles', () => {
    expect(PAGE).toContain('إجمالي الفرص');
    expect(PAGE).toContain('جديدة');
    expect(PAGE).toContain('تحت المراجعة');
    expect(PAGE).toContain('مسندة لمزودين');
    expect(PAGE).toContain('لديها عروض');
    expect(PAGE).toContain('معمّدة');
    expect(PAGE).toContain('لديها عقد');
    expect(PAGE).toContain('ملغاة');
  });
  it('3. renders the funnel section', () => {
    expect(PAGE).toContain('مسار التحويل');
    expect(PAGE).toMatch(/getOpportunityFunnel/);
  });
  it('4. renders the operations table', () => {
    expect(PAGE).toContain('آخر الفرص');
    expect(PAGE).toMatch(/listOpportunityOpsRows/);
  });
  it('5. renders the five operational flags', () => {
    expect(PAGE).toContain('تحتاج مطابقة');
    expect(PAGE).toContain('بانتظار عروض');
    expect(PAGE).toContain('بانتظار تعميد');
    expect(PAGE).toContain('بانتظار عقد');
    expect(PAGE).toContain('مكتملة تشغيليًا');
  });
  it('6. provides the details CTA per row', () => {
    expect(PAGE).toContain('عرض التفاصيل');
    expect(PAGE).toMatch(/\/admin\/opportunities\//);
  });
  it('7. has an empty state', () => {
    expect(PAGE).toContain('لا توجد فرص');
  });
  it('8. has an error state', () => {
    expect(PAGE).toMatch(/تعذر تحميل بيانات لوحة العمليات/);
  });
  it('9. does NOT expose any write/admin action (matching/bids/award/contract mutations)', () => {
    expect(PAGE).not.toMatch(/\.insert\(/);
    expect(PAGE).not.toMatch(/\.update\(/);
    expect(PAGE).not.toMatch(/\.delete\(/);
    expect(PAGE).not.toMatch(/\.upsert\(/);
    expect(PAGE).not.toMatch(/supabase\.rpc\(/);
    expect(PAGE).not.toMatch(/awardOpportunityBid|convertAwardedBidToContract|submitOpportunityBid/);
  });
  it('10. no suppressions / any / service_role', () => {
    expect(PAGE).not.toMatch(/@ts-(ignore|expect-error|nocheck)/);
    expect(PAGE).not.toMatch(/:\s*any\b/);
    expect(PAGE).not.toMatch(/\bas\s+any\b/);
    expect(PAGE).not.toMatch(/service_role/i);
  });
});
