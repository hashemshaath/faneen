import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(__dirname, '..', '..');
const PAGE = readFileSync(
  resolve(ROOT, 'src/pages/admin/AdminOpportunitiesOperations.tsx'),
  'utf8',
);

describe('Opportunities Phase 9 — admin operational alerts section', () => {
  it('1. renders a "تنبيهات تشغيلية" section', () => {
    expect(PAGE).toContain('تنبيهات تشغيلية');
    expect(PAGE).toMatch(/aria-label="Operational alerts"/);
  });
  it('2. surfaces all four operational flags', () => {
    for (const flag of ['needs_matching', 'awaiting_bids', 'awaiting_award', 'awaiting_contract']) {
      expect(PAGE).toContain(flag);
    }
  });
  it('3. only CTA is "عرض التفاصيل"', () => {
    expect(PAGE).toContain('عرض التفاصيل');
    expect(PAGE).not.toMatch(/onClick=\{/);
  });
  it('4. no executive action buttons in the page', () => {
    expect(PAGE).not.toMatch(/awardOpportunityBid|convertAwardedBidToContract|submitOpportunityBid|rematch/i);
    expect(PAGE).not.toMatch(/\.insert\(|\.update\(|\.delete\(|\.upsert\(/);
    expect(PAGE).not.toMatch(/supabase\.rpc\(/);
  });
  it('5. empty state when no alerts', () => {
    expect(PAGE).toContain('لا توجد تنبيهات تشغيلية');
  });
  it('6. no write operations / no service_role / no any', () => {
    expect(PAGE).not.toMatch(/service_role/i);
    expect(PAGE).not.toMatch(/:\s*any\b/);
    expect(PAGE).not.toMatch(/\bas\s+any\b/);
    expect(PAGE).not.toMatch(/@ts-(ignore|expect-error|nocheck)/);
  });
});
