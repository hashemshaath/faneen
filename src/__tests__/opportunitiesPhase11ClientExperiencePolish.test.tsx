import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(__dirname, '..', '..');
const PAGE = readFileSync(
  resolve(ROOT, 'src/pages/dashboard/QuoteRequestDetails.tsx'),
  'utf8',
);
const TIMELINE = readFileSync(
  resolve(ROOT, 'src/modules/opportunities/timeline/OpportunityTimeline.tsx'),
  'utf8',
);

describe('Opportunities Phase 11 — client experience polish', () => {
  it('1. client opportunity page exposes the «الفرص» surface', () => {
    expect(PAGE).toMatch(/ClientBidsSection/);
    expect(PAGE).toMatch(/OpportunityContractSection/);
  });

  it('2. opportunity details renders the timeline', () => {
    expect(PAGE).toMatch(/<OpportunityTimeline\b/);
    expect(PAGE).toMatch(/from\s+'@\/modules\/opportunities\/timeline'/);
    expect(TIMELINE).toMatch(/تم إنشاء الفرصة/);
    expect(TIMELINE).toMatch(/تمت المراجعة/);
    expect(TIMELINE).toMatch(/تم إسناد مزودين/);
    expect(TIMELINE).toMatch(/تم استلام عروض/);
    expect(TIMELINE).toMatch(/تم تعميد عرض/);
    expect(TIMELINE).toMatch(/تم إنشاء عقد مبدئي/);
  });

  it('3. submitted bids are rendered (ClientBidsSection)', () => {
    expect(PAGE).toMatch(/<ClientBidsSection[\s\S]*?canAward[\s\S]*?\/>/);
  });

  it('4. winning bid is surfaced via canAward + emerald winner badge', () => {
    const CLIENT_BIDS = readFileSync(
      resolve(ROOT, 'src/modules/opportunities/bids/ClientBidsSection.tsx'),
      'utf8',
    );
    expect(CLIENT_BIDS).toMatch(/العرض الفائز/);
    expect(CLIENT_BIDS).toMatch(/awardedBidId/);
  });

  it('5. initial contract section is rendered when present', () => {
    expect(PAGE).toMatch(/<OpportunityContractSection[\s\S]*?canConvert[\s\S]*?\/>/);
  });

  it('6. no provider-only actions leak into the client page', () => {
    expect(PAGE).not.toMatch(/ProviderBidSection/);
    expect(PAGE).not.toMatch(/سحب العرض/);
    expect(PAGE).not.toMatch(/تقديم عرض/);
  });

  it('7. empty / loading / error states are present', () => {
    expect(PAGE).toMatch(/<Skeleton\b/);
    expect(PAGE).toMatch(/لم يتم العثور على الطلب|لا يمكنك الوصول/);
    expect(PAGE).toMatch(/لا توجد ملفات مرفقة/);
  });

  it('8. no any / suppressions / service_role on the page', () => {
    expect(PAGE).not.toMatch(/:\s*any\b/);
    expect(PAGE).not.toMatch(/\bas\s+any\b/);
    expect(PAGE).not.toMatch(/@ts-(ignore|expect-error|nocheck)/);
    expect(PAGE).not.toMatch(/service_role/i);
  });
});