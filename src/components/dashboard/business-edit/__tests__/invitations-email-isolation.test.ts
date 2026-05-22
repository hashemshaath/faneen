import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const read = (p: string) => readFileSync(resolve(process.cwd(), p), 'utf8');

const DIRECT_INVOKE = /supabase\.functions\.invoke\(\s*['"]send-transactional-email['"]/;
const WRAPPER_IMPORT = /from\s+['"]@\/modules\/notifications\/services\/sendTransactionalEmail['"]/;
const WRAPPER_CALL = /sendTransactionalEmail\(/;

describe('E-Mail-8: InvitationsPanel email isolation', () => {
  const src = read('src/components/dashboard/business-edit/InvitationsPanel.tsx');

  it('no longer directly calls supabase.functions.invoke for send-transactional-email', () => {
    expect(src).not.toMatch(DIRECT_INVOKE);
  });

  it('imports and uses the shared sendTransactionalEmail wrapper', () => {
    expect(src).toMatch(WRAPPER_IMPORT);
    expect(src).toMatch(WRAPPER_CALL);
  });

  it('preserves exact business-staff-invitation template name for both callsites', () => {
    const matches = src.match(/templateName: 'business-staff-invitation'/g);
    expect(matches).toHaveLength(2);
  });

  it('preserves idempotencyKey pattern for initial invitation', () => {
    expect(src).toContain('idempotencyKey: `staff-invite-${inserted?.id ?? token}`');
  });

  it('preserves idempotencyKey pattern for resend invitation', () => {
    expect(src).toContain('idempotencyKey: `staff-invite-resend-${row.id}-${Date.now()}`');
  });

  it('preserves templateData shape for initial invitation (recipientEmail, businessName, inviterName, roleAr, roleEn, acceptUrl, expiryDate)', () => {
    expect(src).toContain('recipientEmail: trimmed');
    expect(src).toContain('inviterName');
    expect(src).toContain('roleAr: STAFF_ROLE_META[role].ar');
    expect(src).toContain('roleEn: STAFF_ROLE_META[role].en');
    expect(src).toContain('acceptUrl: acceptUrlFor(token)');
    expect(src).toContain('expiryDate: expiresAt.slice(0, 10)');
  });

  it('preserves templateData shape for resend invitation (recipientEmail, businessName, roleAr, roleEn, acceptUrl, expiryDate)', () => {
    expect(src).toContain('recipientEmail: row.email');
    expect(src).toContain('roleAr: STAFF_ROLE_META[row.role].ar');
    expect(src).toContain('roleEn: STAFF_ROLE_META[row.role].en');
    expect(src).toContain('acceptUrl: acceptUrlFor(row.token)');
    expect(src).toContain('expiryDate: row.expires_at.slice(0, 10)');
  });

  it('preserves awaited behavior and { error } destructuring for both callsites', () => {
    const matches = src.match(/const \{ error: emailError \} = await sendTransactionalEmail\(/g);
    expect(matches).toHaveLength(2);
  });

  it('preserves error-throw behavior (if emailError) for both callsites', () => {
    const matches = src.match(/if \(emailError\) throw emailError;/g);
    expect(matches).toHaveLength(2);
  });

  it('preserves toast behavior on success and error for initial invitation', () => {
    expect(src).toContain("toast.success(isRTL ? 'تم إرسال الدعوة بالبريد الإلكتروني' : 'Invitation email sent')");
    expect(src).toContain("toast.error(isRTL ? `تعذّر الإرسال: ${msg}` : `Failed to send: ${msg}`)");
  });

  it('preserves toast behavior on success and error for resend invitation', () => {
    expect(src).toContain("toast.success(isRTL ? 'تم إعادة إرسال الدعوة' : 'Invitation resent')");
    expect(src).toContain("toast.error(isRTL ? `تعذّر الإرسال: ${msg}` : `Resend failed: ${msg}`)");
  });

  it('keeps supabase import for invitation insert/update/list and profile lookup', () => {
    expect(src).toMatch(/import\s*\{[^}]*supabase[^}]*\}\s*from\s+['"]@\/integrations\/supabase\/client['"]/);
  });

  it('preserves loading/submitting state (setSending, setBusyId) and query invalidation', () => {
    expect(src).toContain('setSending(true)');
    expect(src).toContain("qc.invalidateQueries({ queryKey: ['business-invitations', businessId] })");
    expect(src).toContain('setBusyId(row.id)');
    expect(src).toContain('setBusyId(null)');
  });
});

describe('E-Mail-8: cross-file guardrails', () => {
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

  it('Contact remains clean', () => {
    expect(read('src/pages/Contact.tsx')).not.toMatch(DIRECT_INVOKE);
  });

  it('AdminProviderReview is clean (E-Mail-9)', () => {
    expect(read('src/pages/admin/AdminProviderReview.tsx')).not.toMatch(DIRECT_INVOKE);
  });

  it('deferred callsite remains (EmailTemplatePreview)', () => {
    expect(read('src/components/admin/email-center/EmailTemplatePreview.tsx')).toMatch(DIRECT_INVOKE);
  });
});
