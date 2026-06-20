import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(__dirname, '..', '..');
const PAGE = readFileSync(
  resolve(ROOT, 'src/pages/dashboard/ProviderLeadDetails.tsx'),
  'utf8',
);
const PROVIDER_BID = readFileSync(
  resolve(ROOT, 'src/modules/opportunities/bids/ProviderBidSection.tsx'),
  'utf8',
);

describe('Opportunities Phase 11 — provider experience polish', () => {
  it('1. provider lead page presents «الفرص» surface (assigned)', () => {
    expect(PAGE).toMatch(/الرجوع للفرص/);
    expect(PAGE).toMatch(/ProviderBidSection/);
  });

  it('2. provider details do NOT render competitor bids list', () => {
    expect(PAGE).not.toMatch(/ClientBidsSection/);
    expect(PAGE).not.toMatch(/listOpportunityBidsForClient/);
  });

  it('3. provider page does NOT expose the award CTA', () => {
    expect(PAGE).not.toMatch(/awardOpportunityBid/);
    expect(PAGE).not.toMatch(/تعميد العرض/);
    expect(PAGE).not.toMatch(/canAward/);
  });

  it('4. provider page does NOT expose contract-conversion CTA', () => {
    expect(PAGE).toMatch(/canConvert=\{false\}/);
    expect(PAGE).not.toMatch(/convertAwardedBidToContract/);
    expect(PAGE).not.toMatch(/تحويل إلى عقد/);
  });

  it('5. provider bid status surface covers submitted / awarded / withdraw', () => {
    expect(PROVIDER_BID).toMatch(/تم تعميد عرضك/);
    expect(PROVIDER_BID).toMatch(/سحب العرض/);
    expect(PROVIDER_BID).toMatch(/getAssignmentStatusLabel/);
  });

  it('6. submit-bid CTA is clearly exposed when provider has no bid yet', () => {
    expect(PROVIDER_BID).toMatch(/لم تقدم عرضًا بعد على هذه الفرصة\./);
    expect(PROVIDER_BID).toMatch(/OPPORTUNITY_LABELS\.submitBid\.ar/);
  });

  it('7. provider page covers loading / error / mobile / a11y basics', () => {
    expect(PAGE).toMatch(/<Skeleton\b/);
    expect(PAGE).toMatch(/لم يتم العثور على الفرصة/);
    // mobile tap-target standard from prior phases.
    expect(PAGE).toMatch(/min-h-\[44px\]/);
    // timeline (a11y aria-label inside) is rendered.
    expect(PAGE).toMatch(/<OpportunityTimeline\b/);
  });

  it('8. no any / suppressions / service_role on the provider page', () => {
    expect(PAGE).not.toMatch(/:\s*any\b/);
    expect(PAGE).not.toMatch(/\bas\s+any\b/);
    expect(PAGE).not.toMatch(/@ts-(ignore|expect-error|nocheck)/);
    expect(PAGE).not.toMatch(/service_role/i);
  });
});