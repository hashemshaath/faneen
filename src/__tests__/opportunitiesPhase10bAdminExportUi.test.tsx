import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(__dirname, '..', '..');
const PAGE = readFileSync(
  resolve(ROOT, 'src/pages/admin/AdminOpportunitiesOperations.tsx'),
  'utf8',
);
const APP = readFileSync(resolve(ROOT, 'src/App.tsx'), 'utf8');

describe('Opportunities Phase 10B — admin export UI closeout', () => {
  it('1. admin-only route renders the export button', () => {
    expect(APP).toMatch(
      /path="\/admin\/opportunities"\s+element=\{<ProtectedRoute\s+requireAdmin>\s*<AdminOpportunitiesOperations/,
    );
    expect(PAGE).toContain('تصدير التقرير');
  });

  it('2. UI explains the report scope and limit', () => {
    expect(PAGE).toContain('النافذة المحمّلة');
    expect(PAGE).toMatch(/OPPORTUNITY_EXPORT_LIMIT/);
  });

  it('3. no xlsx button is exposed (CSV only in this phase)', () => {
    expect(PAGE).not.toMatch(/xlsx/i);
    expect(PAGE).not.toMatch(/excel/i);
  });

  it('4. only allowed actions are عرض التفاصيل + تصدير التقرير', () => {
    expect(PAGE).toContain('عرض التفاصيل');
    const onClicks = PAGE.match(/onClick=\{[^}]+\}/g) ?? [];
    expect(onClicks.length).toBe(1);
    expect(onClicks[0]).toMatch(/handleExport/);
  });

  it('5. export button has loading/disabled guard (no double-click)', () => {
    expect(PAGE).toMatch(/isExporting/);
    expect(PAGE).toMatch(/disabled=\{[^}]*isExporting[^}]*\}/);
    expect(PAGE).toContain('جارٍ التصدير');
  });

  it('6. empty data state disables export rather than crashing', () => {
    expect(PAGE).toMatch(/disabled=\{[^}]*rows\.data[^}]*\.length\s*===\s*0[^}]*\}/);
    expect(PAGE).toMatch(/if\s*\(\s*data\.length\s*===\s*0\s*\)\s*return/);
  });

  it('7. no service_role / any / suppressions on the page', () => {
    expect(PAGE).not.toMatch(/service_role/i);
    expect(PAGE).not.toMatch(/:\s*any\b/);
    expect(PAGE).not.toMatch(/\bas\s+any\b/);
    expect(PAGE).not.toMatch(/@ts-(ignore|expect-error|nocheck)/);
  });

  it('8. no mutation helpers / rpc / write calls on the page', () => {
    expect(PAGE).not.toMatch(
      /awardOpportunityBid|convertAwardedBidToContract|submitOpportunityBid|rematch/i,
    );
    expect(PAGE).not.toMatch(/\.insert\(|\.update\(|\.delete\(|\.upsert\(/);
    expect(PAGE).not.toMatch(/supabase\.rpc\(/);
  });
});