import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const read = (p: string) => readFileSync(resolve(process.cwd(), p), 'utf8');

const DIRECT_INVOKE = /supabase\.functions\.invoke\(\s*['"]send-transactional-email['"]/;
const WRAPPER_IMPORT = /from\s+['"]@\/modules\/notifications\/services\/sendTransactionalEmail['"]/;
const WRAPPER_CALL = /sendTransactionalEmail\(/;

describe('E-Mail-7: Contact.tsx email isolation', () => {
  const src = read('src/pages/Contact.tsx');

  it('no longer directly calls supabase.functions.invoke for send-transactional-email', () => {
    expect(src).not.toMatch(DIRECT_INVOKE);
  });

  it('imports and uses the shared sendTransactionalEmail wrapper', () => {
    expect(src).toMatch(WRAPPER_IMPORT);
    expect(src).toMatch(WRAPPER_CALL);
  });

  it('preserves exact contact-confirmation template name', () => {
    expect(src).toContain("templateName: 'contact-confirmation'");
  });

  it('preserves exact contact-admin-notification template name', () => {
    expect(src).toContain("templateName: 'contact-admin-notification'");
  });

  it('preserves idempotencyKey pattern for customer confirmation', () => {
    expect(src).toContain('idempotencyKey: `contact-confirm-${id}`');
  });

  it('preserves idempotencyKey pattern for admin notification', () => {
    expect(src).toContain('idempotencyKey: `contact-admin-${id}`');
  });

  it('preserves templateData shape for contact-confirmation (name, subject)', () => {
    expect(src).toContain('name: form.name.trim(),');
    expect(src).toContain('subject: form.subject.trim(),');
  });

  it('preserves templateData shape for contact-admin-notification (name, email, subject, message)', () => {
    expect(src).toContain('email: form.email.trim().toLowerCase(),');
    expect(src).toContain('message: form.message.trim(),');
  });

  it('preserves sequential awaited behavior for both emails', () => {
    expect(src).toMatch(/await sendTransactionalEmail\(/g);
    const firstIndex = src.indexOf('await sendTransactionalEmail({');
    const secondIndex = src.indexOf('await sendTransactionalEmail({', firstIndex + 1);
    expect(secondIndex).toBeGreaterThan(firstIndex);
  });

  it('preserves outer try/catch so email errors bubble to toast', () => {
    expect(src).toMatch(/try \{/);
    expect(src).toMatch(/await sendTransactionalEmail\(/);
    expect(src).toMatch(/toast\.error\(/);
  });

  it('keeps supabase import for contact_messages insert', () => {
    expect(src).toMatch(/import\s*\{[^}]*supabase[^}]*\}\s*from\s+['"]@\/integrations\/supabase\/client['"]/);
  });
});

describe('E-Mail-7: cross-file guardrails', () => {
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

  it('BookingWidget remains clean', () => {
    expect(read('src/components/booking/BookingWidget.tsx')).not.toMatch(DIRECT_INVOKE);
  });

  it('deferred callsites are NOT migrated in this phase (still use direct invoke)', () => {
    expect(read('src/pages/admin/AdminProviderReview.tsx')).toMatch(DIRECT_INVOKE);
    expect(read('src/components/admin/email-center/EmailTemplatePreview.tsx')).toMatch(DIRECT_INVOKE);
  });
});
