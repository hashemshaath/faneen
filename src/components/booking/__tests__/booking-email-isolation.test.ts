import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const read = (p: string) => readFileSync(resolve(process.cwd(), p), 'utf8');

const DIRECT_INVOKE = /supabase\.functions\.invoke\(\s*['"]send-transactional-email['"]/;
const WRAPPER_IMPORT = /from\s+['"]@\/modules\/notifications\/services\/sendTransactionalEmail['"]/;
const WRAPPER_CALL = /sendTransactionalEmail\(/;

describe('E-Mail-6: BookingWidget email isolation', () => {
  const src = read('src/components/booking/BookingWidget.tsx');

  it('no longer directly calls supabase.functions.invoke for send-transactional-email', () => {
    expect(src).not.toMatch(DIRECT_INVOKE);
  });

  it('imports and uses the shared sendTransactionalEmail wrapper', () => {
    expect(src).toMatch(WRAPPER_IMPORT);
    expect(src).toMatch(WRAPPER_CALL);
  });

  it('preserves exact booking-confirmation template name', () => {
    expect(src).toContain("templateName: 'booking-confirmation'");
  });

  it('preserves idempotencyKey pattern with bookingId', () => {
    expect(src).toContain('idempotencyKey: `booking-confirm-${bookingId}`');
  });

  it('preserves templateData shape (clientName, businessName, bookingDate, startTime, refId)', () => {
    expect(src).toContain('clientName: user.user_metadata?.full_name || \'\'');
    expect(src).toContain('businessName,');
    expect(src).toContain('bookingDate: dateStr');
    expect(src).toContain('startTime: slot.time');
    expect(src).toContain('refId: inserted?.ref_id || \'\'');
  });

  it('preserves fire-and-forget non-awaited behavior with .catch(console.error)', () => {
    const emailBlock = src.slice(src.indexOf('sendTransactionalEmail({'));
    expect(emailBlock).toMatch(/\.catch\(console\.error\)/);
  });

  it('keeps supabase import for DB queries and booking insert', () => {
    expect(src).toMatch(/import\s*\{[^}]*supabase[^}]*\}\s*from\s+['"]@\/integrations\/supabase\/client['"]/);
  });
});

describe('E-Mail-6: cross-file guardrails', () => {
  it('lead/quote pages remain clean', () => {
    expect(read('src/components/lead/LeadRequestForm.tsx')).not.toMatch(DIRECT_INVOKE);
    expect(read('src/pages/Quote.tsx')).not.toMatch(DIRECT_INVOKE);
    expect(read('src/pages/dashboard/QuoteRequestDetails.tsx')).not.toMatch(DIRECT_INVOKE);
    expect(read('src/pages/admin/AdminLeadRequests.tsx')).not.toMatch(DIRECT_INVOKE);
  });

  it('authService remains clean', () => {
    expect(read('src/services/auth/authService.ts')).not.toMatch(DIRECT_INVOKE);
  });

  it('ContractDetail and DashboardContracts remain clean', () => {
    expect(read('src/pages/ContractDetail.tsx')).not.toMatch(DIRECT_INVOKE);
    expect(read('src/pages/dashboard/DashboardContracts.tsx')).not.toMatch(DIRECT_INVOKE);
  });

  it('Membership and AdminUpgradeRequestsPanel remain clean', () => {
    expect(read('src/pages/Membership.tsx')).not.toMatch(DIRECT_INVOKE);
    expect(read('src/components/membership/AdminUpgradeRequestsPanel.tsx')).not.toMatch(DIRECT_INVOKE);
  });

  it('AdminProviderReview is clean (E-Mail-9)', () => {
    expect(read('src/pages/admin/AdminProviderReview.tsx')).not.toMatch(DIRECT_INVOKE);
  });

  it('deferred callsite remains (EmailTemplatePreview)', () => {
    expect(read('src/components/admin/email-center/EmailTemplatePreview.tsx')).toMatch(DIRECT_INVOKE);
  });
});
