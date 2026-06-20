import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(__dirname, '..', '..');
const SECTION = readFileSync(
  resolve(ROOT, 'src/modules/opportunities/contracts/OpportunityContractSection.tsx'),
  'utf8',
);
const CLIENT_PAGE = readFileSync(
  resolve(ROOT, 'src/pages/dashboard/QuoteRequestDetails.tsx'),
  'utf8',
);
const ADMIN_PAGE = readFileSync(
  resolve(ROOT, 'src/pages/admin/AdminQuoteRequestDetails.tsx'),
  'utf8',
);
const PROVIDER_PAGE = readFileSync(
  resolve(ROOT, 'src/pages/dashboard/ProviderLeadDetails.tsx'),
  'utf8',
);

describe('Opportunities Phase 7 — contract conversion UI', () => {
  it('hides the section before awarding (no awardedBidId AND no contract)', () => {
    expect(SECTION).toMatch(/if \(!awardedBidId && !contract\) return null/);
  });
  it('exposes the "تحويل إلى عقد" CTA only when canConvert && awardedBidId', () => {
    expect(SECTION).toMatch(/canConvert && awardedBidId/);
    expect(SECTION).toContain('تحويل إلى عقد');
    expect(SECTION).toContain('convertAwardedBidToContract');
  });
  it('client page mounts <OpportunityContractSection canConvert>', () => {
    expect(CLIENT_PAGE).toMatch(/<OpportunityContractSection[\s\S]{0,200}canConvert/);
  });
  it('admin page mounts <OpportunityContractSection canConvert>', () => {
    expect(ADMIN_PAGE).toMatch(/<OpportunityContractSection[\s\S]{0,200}canConvert/);
  });
  it('provider page mounts <OpportunityContractSection canConvert={false}>', () => {
    expect(PROVIDER_PAGE).toMatch(/<OpportunityContractSection[\s\S]{0,200}canConvert=\{false\}/);
  });
  it('provider page never imports or calls the conversion service', () => {
    expect(PROVIDER_PAGE).not.toContain('convertAwardedBidToContract');
  });
  it('renders «عرض العقد» link after creation', () => {
    expect(SECTION).toContain('عرض العقد');
    expect(SECTION).toMatch(/\/dashboard\/contracts\//);
  });
  it('does not expose payment or work-order CTAs', () => {
    expect(SECTION).not.toMatch(/أمر عمل|work[_\s-]?order|payment|دفع|سداد/i);
  });
  it('uses no any/suppressions', () => {
    expect(SECTION).not.toMatch(/:\s*any\b/);
    expect(SECTION).not.toMatch(/\bas\s+any\b/);
    expect(SECTION).not.toMatch(/@ts-(ignore|expect-error|nocheck)/);
  });
});
