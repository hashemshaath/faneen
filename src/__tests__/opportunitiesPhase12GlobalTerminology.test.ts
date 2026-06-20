import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { OPPORTUNITY_LABELS } from '@/modules/opportunities/opportunityLabels';

const ROOT = resolve(__dirname, '..', '..');
const read = (p: string) => readFileSync(resolve(ROOT, p), 'utf8');

const LABELS = read('src/modules/opportunities/opportunityLabels.ts');
const PROVIDER_BID = read('src/modules/opportunities/bids/ProviderBidSection.tsx');
const PROVIDER_PAGE = read('src/pages/dashboard/ProviderLeadDetails.tsx');
const QUOTE_DETAILS = read('src/pages/dashboard/QuoteRequestDetails.tsx');
const ADMIN_OPS = read('src/pages/admin/AdminOpportunitiesOperations.tsx');
const MY_REQUESTS = read('src/pages/dashboard/DashboardMyRequests.tsx');
const HOME = read('src/components/home/v2/HomeV2.tsx');
const NAVBAR = read('src/components/layout/Navbar.tsx');

/** Strip JS/TS comments so legacy strings inside comments don't fail the audit. */
const stripComments = (src: string) =>
  src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');

describe('Opportunities Phase 12 — global terminology', () => {
  it('1. central registry exposes canonical Phase 12 labels', () => {
    expect(OPPORTUNITY_LABELS.opportunities.ar).toBe('الفرص');
    expect(OPPORTUNITY_LABELS.opportunityDetails.ar).toBe('تفاصيل الفرصة');
    expect(OPPORTUNITY_LABELS.assignedOpportunities.ar).toBe('الفرص المسندة');
    expect(OPPORTUNITY_LABELS.submittedBids.ar).toBe('العروض المقدمة');
    expect(OPPORTUNITY_LABELS.winningBid.ar).toBe('العرض الفائز');
    expect(OPPORTUNITY_LABELS.draftContract.ar).toBe('العقد المبدئي');
    expect(OPPORTUNITY_LABELS.operationsCenter.ar).toBe('مركز عمليات الفرص');
    expect(OPPORTUNITY_LABELS.manageOpportunities.ar).toBe('إدارة الفرص');
  });

  it('2. provider bid UI does not surface "Provider Leads" wording', () => {
    expect(PROVIDER_BID).not.toMatch(/Provider Leads/i);
    expect(PROVIDER_BID).not.toMatch(/طلبات المزودين/);
  });

  it('3. new opportunity surfaces do not use RFQ as a visible heading', () => {
    for (const src of [QUOTE_DETAILS, ADMIN_OPS]) {
      expect(src).not.toMatch(/>\s*RFQ\s*</);
      expect(src).not.toMatch(/صندوق RFQ/);
    }
  });

  it('4. opportunity details page title is "تفاصيل الفرصة"', () => {
    expect(QUOTE_DETAILS).toContain('تفاصيل الفرصة');
    expect(QUOTE_DETAILS).not.toContain('تفاصيل طلب عرض السعر');
  });

  it('5. new opportunity surfaces do not display "طلبات عروض الأسعار"', () => {
    for (const src of [QUOTE_DETAILS, ADMIN_OPS, PROVIDER_BID, MY_REQUESTS]) {
      expect(stripComments(src)).not.toContain('طلبات عروض الأسعار');
    }
  });

  it('5b. visible "طلب عرض سعر" copy removed from client opportunity surfaces', () => {
    for (const src of [MY_REQUESTS, HOME]) {
      expect(stripComments(src)).not.toMatch(/طلب عرض سعر/);
    }
  });

  it('5c. navbar primary CTA copy is opportunity-aligned (comments allowed)', () => {
    const code = stripComments(NAVBAR);
    expect(code).not.toMatch(/'اطلب عرض سعر'/);
    expect(code).not.toMatch(/'اطلب عرض سعر مجانًا'/);
    expect(code).toMatch(/ابدأ فرصة/);
  });

  it('6. internal table/service names remain unchanged (UI-only rename)', () => {
    // The label registry comment intentionally references the legacy tables.
    expect(LABELS).toMatch(/quote_requests/);
    expect(LABELS).toMatch(/provider_leads/);
  });

  it('7. no any / as any in audited frontend files', () => {
    for (const src of [LABELS, PROVIDER_BID, PROVIDER_PAGE, QUOTE_DETAILS, ADMIN_OPS]) {
      expect(src).not.toMatch(/:\s*any\b/);
      expect(src).not.toMatch(/\bas\s+any\b/);
    }
  });

  it('8. no ts/eslint suppressions in audited frontend files', () => {
    for (const src of [LABELS, PROVIDER_BID, PROVIDER_PAGE, QUOTE_DETAILS, ADMIN_OPS]) {
      expect(src).not.toMatch(/@ts-(ignore|expect-error|nocheck)/);
      expect(src).not.toMatch(/eslint-disable/);
    }
  });
});