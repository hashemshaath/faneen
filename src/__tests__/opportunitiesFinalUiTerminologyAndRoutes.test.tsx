import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(__dirname, '..', '..');
const APP = readFileSync(resolve(ROOT, 'src/App.tsx'), 'utf8');
const LABELS = readFileSync(
  resolve(ROOT, 'src/modules/opportunities/opportunityLabels.ts'),
  'utf8',
);
const PROVIDER_BID = readFileSync(
  resolve(ROOT, 'src/modules/opportunities/bids/ProviderBidSection.tsx'),
  'utf8',
);
const PROVIDER_PAGE = readFileSync(
  resolve(ROOT, 'src/pages/dashboard/ProviderLeadDetails.tsx'),
  'utf8',
);
const ADMIN_OPS = readFileSync(
  resolve(ROOT, 'src/pages/admin/AdminOpportunitiesOperations.tsx'),
  'utf8',
);

describe('Opportunities — final UI terminology + routes audit', () => {
  it('1. canonical terminology "الفرص" exists in labels', () => {
    expect(LABELS).toContain('الفرص');
  });
  it('2. new canonical routes are wired', () => {
    expect(APP).toMatch(/path="\/dashboard\/opportunities"/);
    expect(APP).toMatch(/path="\/dashboard\/opportunities\/assigned"/);
    expect(APP).toMatch(/path="\/dashboard\/opportunities\/:id"/);
    expect(APP).toMatch(/path="\/admin\/opportunities"/);
  });
  it('3. legacy routes preserved as redirects (no removals)', () => {
    expect(APP).toMatch(/path="\/dashboard\/provider\/leads"/);
    expect(APP).toMatch(/path="\/dashboard\/rfq"/);
    expect(APP).toMatch(/path="\/dashboard\/rfq\/inbox"/);
    expect(APP).toMatch(/path="\/admin\/quote-requests"/);
    expect(APP).toMatch(/path="\/admin\/quote-requests\/:id"/);
  });
  it('4. provider bid UI does not use "Provider Leads" terminology', () => {
    expect(PROVIDER_BID).not.toMatch(/Provider Leads/i);
    expect(PROVIDER_BID).not.toMatch(/طلبات المزودين/);
  });
  it('5. provider bid UI exposes no award button', () => {
    expect(PROVIDER_BID).not.toMatch(/awardOpportunityBid|award_opportunity_bid|تعميد/);
  });
  it('6. provider bid UI exposes no contract-conversion action', () => {
    expect(PROVIDER_BID).not.toMatch(/convertAwardedBidToContract|convert_awarded_bid_to_contract|تحويل إلى عقد/);
    expect(PROVIDER_PAGE).not.toMatch(/convertAwardedBidToContract\(/);
  });
  it('7. provider surfaces expose no payment / work order CTA', () => {
    for (const src of [PROVIDER_BID, PROVIDER_PAGE]) {
      expect(src).not.toMatch(/work_order|workOrder/i);
      expect(src).not.toMatch(/payment_intent|installment|invoice/i);
    }
  });
  it('8. admin operations center alerts use only the "عرض التفاصيل" CTA', () => {
    expect(ADMIN_OPS).toContain('عرض التفاصيل');
    expect(ADMIN_OPS).not.toMatch(/مطابقة الآن|تعميد الآن|تحويل إلى عقد|إرسال إشعار|إعادة تشغيل/);
    expect(ADMIN_OPS).not.toMatch(/onClick=\{/);
  });
  it('9. no any / suppressions / service_role in audited frontend files', () => {
    for (const src of [PROVIDER_BID, PROVIDER_PAGE, ADMIN_OPS, LABELS]) {
      expect(src).not.toMatch(/:\s*any\b/);
      expect(src).not.toMatch(/\bas\s+any\b/);
      expect(src).not.toMatch(/@ts-(ignore|expect-error|nocheck)/);
      expect(src).not.toMatch(/service_role/i);
    }
  });
});
