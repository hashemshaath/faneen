import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * OPPORTUNITIES PHASE 5 — UI wiring guards.
 * Static-only: confirms the bid sections are mounted in the canonical
 * detail pages, no award action is exposed yet, and legacy routes are
 * still registered.
 */
const ROOT = resolve(__dirname, '..', '..');
const PROVIDER_SECTION = readFileSync(
  resolve(ROOT, 'src/modules/opportunities/bids/ProviderBidSection.tsx'), 'utf8');
const CLIENT_SECTION = readFileSync(
  resolve(ROOT, 'src/modules/opportunities/bids/ClientBidsSection.tsx'), 'utf8');
const PROVIDER_PAGE = readFileSync(
  resolve(ROOT, 'src/pages/dashboard/ProviderLeadDetails.tsx'), 'utf8');
const CLIENT_PAGE = readFileSync(
  resolve(ROOT, 'src/pages/dashboard/QuoteRequestDetails.tsx'), 'utf8');
const ADMIN_PAGE = readFileSync(
  resolve(ROOT, 'src/pages/admin/AdminQuoteRequestDetails.tsx'), 'utf8');
const APP = readFileSync(resolve(ROOT, 'src/App.tsx'), 'utf8');

describe('opportunity bids — UI mounting', () => {
  it('provider page imports + renders <ProviderBidSection>', () => {
    expect(PROVIDER_PAGE).toContain('ProviderBidSection');
    expect(PROVIDER_PAGE).toMatch(/<ProviderBidSection[\s\S]*opportunityId/);
  });

  it('client page imports + renders <ClientBidsSection>', () => {
    expect(CLIENT_PAGE).toContain('ClientBidsSection');
    expect(CLIENT_PAGE).toMatch(/<ClientBidsSection[\s\S]*opportunityId/);
  });

  it('admin page imports + renders <ClientBidsSection>', () => {
    expect(ADMIN_PAGE).toContain('ClientBidsSection');
  });

  it('provider section exposes a «تقديم عرض» CTA', () => {
    expect(PROVIDER_SECTION).toContain('submitBid');
  });

  it('client section renders an empty state', () => {
    expect(CLIENT_SECTION).toContain('لا توجد عروض بعد');
  });

  // R1 moved the award action into the client bids section; the
  // Phase 5 "no awarding UI" freeze is preserved only on the
  // provider side.
  it('no awarding UI is exposed on the provider side (Phase 5 freeze preserved post-R1)', () => {
    expect(PROVIDER_SECTION).not.toMatch(/awardBid|convertToContract|ترسية|اعتماد العرض/);
  });

  it('canonical opportunities routes are still mounted', () => {
    expect(APP).toContain('path="/dashboard/opportunities/assigned"');
    expect(APP).toContain('path="/dashboard/opportunities/:id"');
    expect(APP).toContain('path="/admin/opportunities/:id"');
  });
});