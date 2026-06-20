import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(__dirname, '..', '..');
const APP = readFileSync(resolve(ROOT, 'src/App.tsx'), 'utf8');
const PAGE = readFileSync(
  resolve(ROOT, 'src/pages/dashboard/ProviderLeadDetails.tsx'),
  'utf8',
);
const HUB = readFileSync(
  resolve(ROOT, 'src/pages/dashboard/DashboardRequestsHub.tsx'),
  'utf8',
);
const PROVIDER_BID = readFileSync(
  resolve(ROOT, 'src/modules/opportunities/bids/ProviderBidSection.tsx'),
  'utf8',
);

describe('Opportunities Final UX Audit — provider', () => {
  it('1. provider sees «الفرص المسندة» surface', () => {
    expect(APP).toMatch(
      /path="\/dashboard\/opportunities\/assigned"[\s\S]*?requireProvider/,
    );
    expect(HUB).toMatch(/الطلبات والفرص|الفرص/);
  });

  it('2. provider page never shows competitor bids list', () => {
    expect(PAGE).not.toMatch(/ClientBidsSection/);
    expect(PAGE).not.toMatch(/listOpportunityBidsForClient/);
  });

  it('3. provider page never shows the award CTA', () => {
    expect(PAGE).not.toMatch(/awardOpportunityBid/);
    expect(PAGE).not.toMatch(/تعميد العرض/);
    expect(PAGE).not.toMatch(/canAward/);
  });

  it('4. provider page never shows the convert-to-contract CTA', () => {
    expect(PAGE).toMatch(/canConvert=\{false\}/);
    expect(PAGE).not.toMatch(/convertAwardedBidToContract/);
    expect(PAGE).not.toMatch(/تحويل إلى عقد/);
  });

  it('5. provider sees their own bid status (submitted/awarded/withdrawn)', () => {
    expect(PROVIDER_BID).toMatch(/تم تعميد عرضك/);
    expect(PROVIDER_BID).toMatch(/سحب العرض/);
    expect(PROVIDER_BID).toMatch(/getAssignmentStatusLabel/);
  });

  it('6. read-only timeline is rendered on the provider page', () => {
    expect(PAGE).toMatch(/<OpportunityTimeline\b/);
  });

  it('7. legacy provider routes redirect safely to the new surface', () => {
    expect(APP).toMatch(
      /path="\/dashboard\/provider\/leads"\s+element=\{<Navigate to="\/dashboard\/opportunities\/assigned"\s+replace/,
    );
    expect(APP).toMatch(
      /path="\/dashboard\/rfq"\s+element=\{<Navigate to="\/dashboard\/opportunities\/assigned"\s+replace/,
    );
    expect(APP).toMatch(
      /path="\/dashboard\/rfq\/inbox"\s+element=\{<Navigate to="\/dashboard\/opportunities\/assigned"\s+replace/,
    );
  });
});