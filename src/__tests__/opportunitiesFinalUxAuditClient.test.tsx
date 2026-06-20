import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(__dirname, '..', '..');
const APP = readFileSync(resolve(ROOT, 'src/App.tsx'), 'utf8');
const PAGE = readFileSync(
  resolve(ROOT, 'src/pages/dashboard/QuoteRequestDetails.tsx'),
  'utf8',
);
const CLIENT_BIDS = readFileSync(
  resolve(ROOT, 'src/modules/opportunities/bids/ClientBidsSection.tsx'),
  'utf8',
);
const CONTRACT = readFileSync(
  resolve(ROOT, 'src/modules/opportunities/contracts/OpportunityContractSection.tsx'),
  'utf8',
);

describe('Opportunities Final UX Audit — client', () => {
  it('1. client opportunity routes are registered with the «الفرص» surface', () => {
    expect(APP).toMatch(/path="\/dashboard\/opportunities"/);
    expect(APP).toMatch(/path="\/dashboard\/opportunities\/:id"/);
  });

  it('2. opportunity details renders the timeline', () => {
    expect(PAGE).toMatch(/<OpportunityTimeline\b/);
  });

  it('3. empty state is shown when there are no bids yet', () => {
    expect(CLIENT_BIDS).toMatch(/لا توجد عروض بعد على هذه الفرصة\./);
  });

  it('4. winning bid is surfaced clearly', () => {
    expect(CLIENT_BIDS).toMatch(/العرض الفائز/);
    expect(CLIENT_BIDS).toMatch(/awardedBidId/);
  });

  it('5. initial contract is surfaced clearly', () => {
    expect(CONTRACT).toMatch(/تم إنشاء عقد مبدئي/);
    expect(CONTRACT).toMatch(/سيظهر العقد هنا بعد إنشائه\./);
  });

  it('6. provider-only actions never appear on the client page', () => {
    expect(PAGE).not.toMatch(/ProviderBidSection/);
    expect(PAGE).not.toMatch(/سحب العرض/);
  });

  it('7. messages are user-friendly (no raw technical jargon)', () => {
    expect(PAGE).not.toMatch(/quote_requests|provider_leads|rfq_quotes/);
    expect(CLIENT_BIDS).not.toMatch(/quote_requests|provider_leads|rfq_quotes/);
    expect(CONTRACT).not.toMatch(/quote_requests|provider_leads|rfq_quotes/);
  });
});