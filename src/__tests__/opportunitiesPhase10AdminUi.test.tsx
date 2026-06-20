import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(__dirname, '..', '..');
const PAGE = readFileSync(
  resolve(ROOT, 'src/pages/admin/AdminOpportunitiesOperations.tsx'),
  'utf8',
);
const APP = readFileSync(resolve(ROOT, 'src/App.tsx'), 'utf8');

describe('Opportunities Phase 10 — admin UI', () => {
  it('1. /admin/opportunities exposes a "تصدير التقرير" button', () => {
    expect(PAGE).toContain('تصدير التقرير');
    expect(PAGE).toMatch(/onClick=\{handleExport\}/);
  });

  it('2. renders SLA badges (on_time / at_risk / breached / completed)', () => {
    expect(PAGE).toContain('ضمن الوقت');
    expect(PAGE).toContain('قريب من التأخير');
    expect(PAGE).toContain('متأخر');
    expect(PAGE).toContain('مكتمل');
  });

  it('3. surfaces SLA delay/aggregate metrics on the page', () => {
    expect(PAGE).toContain('مؤشرات SLA');
    expect(PAGE).toContain('عدد الفرص المتأخرة');
    expect(PAGE).toMatch(/aggregateOpportunitySla/);
  });

  it('4. /admin/opportunities is admin-only (so export is admin-only)', () => {
    expect(APP).toMatch(
      /path="\/admin\/opportunities"\s+element=\{<ProtectedRoute\s+requireAdmin>\s*<AdminOpportunitiesOperations/,
    );
  });

  it('5. the only allowed actions are "عرض التفاصيل" and "تصدير التقرير"', () => {
    expect(PAGE).toContain('عرض التفاصيل');
    expect(PAGE).toContain('تصدير التقرير');
    const onClicks = PAGE.match(/onClick=\{[^}]+\}/g) ?? [];
    expect(onClicks.length).toBe(1);
    expect(onClicks[0]).toMatch(/handleExport/);
  });

  it('6. no buttons for matching/bids/award/contract mutations', () => {
    expect(PAGE).not.toMatch(
      /awardOpportunityBid|convertAwardedBidToContract|submitOpportunityBid|rematch/i,
    );
    expect(PAGE).not.toMatch(/\.insert\(|\.update\(|\.delete\(|\.upsert\(/);
    expect(PAGE).not.toMatch(/supabase\.rpc\(/);
  });

  it('7. preserves loading / empty / error states', () => {
    expect(PAGE).toMatch(/Skeleton/);
    expect(PAGE).toContain('لا توجد فرص لعرضها بعد');
    expect(PAGE).toContain('تعذر تحميل بيانات لوحة العمليات');
  });

  it('8. export is client-only (no service_role / any / suppressions in page)', () => {
    expect(PAGE).not.toMatch(/service_role/i);
    expect(PAGE).not.toMatch(/:\s*any\b/);
    expect(PAGE).not.toMatch(/\bas\s+any\b/);
    expect(PAGE).not.toMatch(/@ts-(ignore|expect-error|nocheck)/);
  });

  it('9. documents the export limit cap in the UI', () => {
    expect(PAGE).toMatch(/OPPORTUNITY_EXPORT_LIMIT/);
    expect(PAGE).toContain('سقف التصدير');
  });
});