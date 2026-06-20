import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(__dirname, '..', '..');
const CLIENT = readFileSync(resolve(ROOT, 'src/modules/opportunities/bids/ClientBidsSection.tsx'), 'utf8');
const PROVIDER = readFileSync(resolve(ROOT, 'src/modules/opportunities/bids/ProviderBidSection.tsx'), 'utf8');
const CLIENT_PAGE = readFileSync(resolve(ROOT, 'src/pages/dashboard/QuoteRequestDetails.tsx'), 'utf8');
const ADMIN_PAGE = readFileSync(resolve(ROOT, 'src/pages/admin/AdminQuoteRequestDetails.tsx'), 'utf8');
const PROVIDER_PAGE = readFileSync(resolve(ROOT, 'src/pages/dashboard/ProviderLeadDetails.tsx'), 'utf8');

describe('Opportunities Phase 6 — awarding UI', () => {
  it('client section exposes an award CTA gated by canAward', () => {
    expect(CLIENT).toContain('canAward');
    expect(CLIENT).toContain('تعميد العرض');
    expect(CLIENT).toContain('awardOpportunityBid');
  });

  it('client page passes canAward to <ClientBidsSection>', () => {
    expect(CLIENT_PAGE).toMatch(/<ClientBidsSection[\s\S]*canAward/);
  });

  it('admin page passes canAward to <ClientBidsSection>', () => {
    expect(ADMIN_PAGE).toMatch(/<ClientBidsSection[\s\S]*canAward/);
  });

  it('provider page never imports the award service', () => {
    expect(PROVIDER_PAGE).not.toContain('awardOpportunityBid');
    expect(PROVIDER).not.toContain('awardOpportunityBid');
    expect(PROVIDER).not.toContain('تعميد العرض');
  });

  it('client section renders a «العرض الفائز» badge for the winner', () => {
    expect(CLIENT).toContain('العرض الفائز');
  });

  it('provider section shows «تم تعميد عرضك» when their bid is awarded', () => {
    expect(PROVIDER).toContain('تم تعميد عرضك');
  });

  it('no contract-conversion / work-order CTA is rendered', () => {
    for (const src of [CLIENT, PROVIDER]) {
      expect(src).not.toMatch(/convertToContract|تحويل إلى عقد|أمر عمل|createWorkOrder/);
    }
  });

  it('does not leak competitor bid details to the provider', () => {
    // Provider section only uses getMyBidForOpportunity / submit / withdraw —
    // never list-all helpers.
    expect(PROVIDER).not.toContain('listOpportunityBidsForClient');
    expect(PROVIDER).not.toContain('listMySubmittedBidsForProvider');
  });

  it('client section guards the award CTA behind canAward + no existing winner', () => {
    expect(CLIENT).toMatch(/canAward\s*&&\s*!hasWinner/);
  });
});