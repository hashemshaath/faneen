import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const read = (p: string) => readFileSync(resolve(process.cwd(), p), 'utf8');

const DIRECT_INVOKE = /supabase\.functions\.invoke\(\s*['"]send-transactional-email['"]/;
const WRAPPER_IMPORT = /from\s+['"]@\/modules\/notifications\/services\/sendTransactionalEmail['"]/;
const WRAPPER_CALL = /sendTransactionalEmail\(/;

describe('E-Mail-5: AdminUpgradeRequestsPanel email isolation', () => {
  const src = read('src/components/membership/AdminUpgradeRequestsPanel.tsx');

  it('no longer directly calls supabase.functions.invoke for send-transactional-email', () => {
    expect(src).not.toMatch(DIRECT_INVOKE);
  });
  it('imports and uses the shared sendTransactionalEmail wrapper', () => {
    expect(src).toMatch(WRAPPER_IMPORT);
    expect(src).toMatch(WRAPPER_CALL);
  });
  it('preserves exact approve template name and idempotency key pattern', () => {
    expect(src).toContain("templateName: 'membership-upgrade-request-approved'");
    expect(src).toContain('idempotencyKey: `membership-upgrade-approved-${req.id}`');
  });
  it('preserves exact reject template name and idempotency key pattern', () => {
    expect(src).toContain("templateName: 'membership-upgrade-request-rejected'");
    expect(src).toContain('idempotencyKey: `membership-upgrade-rejected-${req.id}`');
  });
  it('preserves awaited try/catch fail-soft behavior (console.warn) for both flows', () => {
    expect(src).toContain("console.warn('[AdminUpgrade] approve email failed'");
    expect(src).toContain("console.warn('[AdminUpgrade] reject email failed'");
    expect(src).toMatch(/await sendTransactionalEmail\(/);
  });
});

describe('E-Mail-5: Membership page email isolation', () => {
  const src = read('src/pages/Membership.tsx');

  it('no longer directly calls supabase.functions.invoke for send-transactional-email', () => {
    expect(src).not.toMatch(DIRECT_INVOKE);
  });
  it('imports and uses the shared sendTransactionalEmail wrapper', () => {
    expect(src).toMatch(WRAPPER_IMPORT);
    expect(src).toMatch(WRAPPER_CALL);
  });
  it('preserves submit template name and idempotency key pattern', () => {
    expect(src).toContain("templateName: 'membership-upgrade-request-submitted'");
    expect(src).toContain('idempotencyKey: `membership-upgrade-submitted-${requestId}`');
  });
  it('preserves cancel template name and idempotency key pattern', () => {
    expect(src).toContain("templateName: 'membership-subscription-cancelled'");
    expect(src).toContain('idempotencyKey: `membership-cancelled-${subId}`');
  });
  it('preserves awaited try/catch fail-soft behavior for both flows', () => {
    expect(src).toContain("console.warn('[Membership] upgrade-submitted email failed'");
    expect(src).toContain("console.warn('[Membership] cancel email failed'");
    expect(src).toMatch(/await sendTransactionalEmail\(/);
  });
});

describe('E-Mail-5: cross-file guardrails', () => {
  it('authService remains clean (no direct send-transactional-email invoke)', () => {
    expect(read('src/services/auth/authService.ts')).not.toMatch(DIRECT_INVOKE);
  });
  it('ContractDetail and DashboardContracts remain clean', () => {
    expect(read('src/pages/ContractDetail.tsx')).not.toMatch(DIRECT_INVOKE);
    expect(read('src/pages/dashboard/DashboardContracts.tsx')).not.toMatch(DIRECT_INVOKE);
  });
  it('lead/quote pages remain clean', () => {
    expect(read('src/components/lead/LeadRequestForm.tsx')).not.toMatch(DIRECT_INVOKE);
    expect(read('src/pages/Quote.tsx')).not.toMatch(DIRECT_INVOKE);
    expect(read('src/pages/dashboard/QuoteRequestDetails.tsx')).not.toMatch(DIRECT_INVOKE);
    expect(read('src/pages/admin/AdminLeadRequests.tsx')).not.toMatch(DIRECT_INVOKE);
  });
  it('AdminProviderReview is clean (E-Mail-9)', () => {
    expect(read('src/pages/admin/AdminProviderReview.tsx')).not.toMatch(DIRECT_INVOKE);
  });

  it('EmailTemplatePreview is now migrated (E-Mail-10)', () => {
    expect(read('src/components/admin/email-center/EmailTemplatePreview.tsx')).not.toMatch(DIRECT_INVOKE);
  });
});