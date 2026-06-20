import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(__dirname, '..', '..');
const APP = readFileSync(resolve(ROOT, 'src/App.tsx'), 'utf8');
const PAGE = readFileSync(
  resolve(ROOT, 'src/pages/admin/AdminOpportunitiesOperations.tsx'),
  'utf8',
);

describe('Opportunities Final UX Audit — admin', () => {
  it('1. /admin/opportunities is admin-only and surfaces KPIs', () => {
    expect(APP).toMatch(
      /path="\/admin\/opportunities"\s+element=\{<ProtectedRoute\s+requireAdmin>\s*<AdminOpportunitiesOperations/,
    );
    expect(PAGE).toMatch(/aria-label="KPIs"/);
  });

  it('2. funnel section is rendered', () => {
    expect(PAGE).toMatch(/funnel\.data/);
    expect(PAGE).toMatch(/مقدمة|مطابقة|مسندة|بعروض|معمّدة|بعقود/);
  });

  it('3. SLA badges are rendered', () => {
    expect(PAGE).toMatch(/SLA_LABEL/);
    expect(PAGE).toMatch(/aria-label="SLA metrics"/);
  });

  it('4. operational alerts panel is rendered', () => {
    expect(PAGE).toMatch(/تنبيهات تشغيلية/);
    expect(PAGE).toMatch(/لا توجد تنبيهات تشغيلية حالية\./);
  });

  it('5. export-report button is rendered', () => {
    expect(PAGE).toMatch(/تصدير التقرير/);
    expect(PAGE).toMatch(/handleExport/);
  });

  it('6. only allowed CTAs are «عرض التفاصيل» and «تصدير التقرير»', () => {
    const onClicks = PAGE.match(/onClick=\{[^}]+\}/g) ?? [];
    expect(onClicks.length).toBe(1);
    expect(onClicks[0]).toMatch(/handleExport/);
    expect(PAGE).toMatch(/عرض التفاصيل/);
  });

  it('7. no executive actions leak into the operations center', () => {
    expect(PAGE).not.toMatch(
      /awardOpportunityBid|convertAwardedBidToContract|submitOpportunityBid|withdrawOpportunityBid|rematch/i,
    );
    expect(PAGE).not.toMatch(/\.insert\(|\.update\(|\.delete\(|\.upsert\(/);
    expect(PAGE).not.toMatch(/supabase\.rpc\(/);
  });
});