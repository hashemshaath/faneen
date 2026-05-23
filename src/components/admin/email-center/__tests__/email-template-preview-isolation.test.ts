import { describe, it, expect } from 'vitest';

const DIRECT_INVOKE = /supabase\.functions\.invoke\(\s*['"]send-transactional-email['"]/;

function read(relativePath: string): string {
  const fs = require('fs');
  const path = require('path');
  return fs.readFileSync(path.resolve(process.cwd(), relativePath), 'utf-8');
}

const TARGET = 'src/components/admin/email-center/EmailTemplatePreview.tsx';

describe('EmailTemplatePreview email isolation (E-Mail-10)', () => {
  it('does not contain direct send-transactional-email invocations', () => {
    expect(read(TARGET)).not.toMatch(DIRECT_INVOKE);
  });

  it('imports sendTransactionalEmail from the shared wrapper', () => {
    expect(read(TARGET)).toContain("import { sendTransactionalEmail } from '@/modules/notifications'");
  });

  it('calls sendTransactionalEmail and destructures { error }', () => {
    const src = read(TARGET);
    expect(src).toMatch(/const\s*\{\s*error\s*\}\s*=\s*await\s+sendTransactionalEmail\(/);
  });

  it('preserves templateName from template.name', () => {
    expect(read(TARGET)).toMatch(/templateName:\s*template\.name/);
  });

  it('preserves recipientEmail from testEmail state', () => {
    expect(read(TARGET)).toMatch(/recipientEmail:\s*testEmail/);
  });

  it('preserves idempotency key pattern', () => {
    expect(read(TARGET)).toContain('`email-center-test-${template.name}-${Date.now()}`');
  });

  it('preserves templateData shape including sampleData spread and test markers', () => {
    const src = read(TARGET);
    expect(src).toContain('...(preview.data?.sampleData ?? {})');
    expect(src).toContain('__test_send: true');
    expect(src).toContain("__prefix: '[اختبار قِطاعات]'");
  });

  it('preserves error-throw on { error } and test-send confirmation flow', () => {
    const src = read(TARGET);
    expect(src).toContain('if (error) throw error;');
    expect(src).toContain('setLastSendId(idempotencyKey);');
    expect(src).toContain('toast.success(');
    expect(src).toContain('toast.error(');
    expect(src).toContain('setConfirming(false)');
    expect(src).toContain('setSending(true)');
    expect(src).toContain('setSending(false)');
  });

  it('uses adminPreviewEmail wrapper and keeps direct email_send_log read', () => {
    const src = read(TARGET);
    // EF-6 migration: admin-preview-email is now invoked through the
    // src/modules/admin wrapper instead of supabase.functions.invoke directly.
    expect(src).toContain("import { adminPreviewEmail } from '@/modules/admin';");
    expect(src).toContain('adminPreviewEmail<PreviewResponse>(');
    expect(src).not.toMatch(/supabase\.functions\.invoke<PreviewResponse>\(\s*'admin-preview-email'/);
    // email_send_log direct read is still intentionally allowed here
    // (not yet governed by a domain isolation track).
    expect(src).toContain("import { supabase } from '@/integrations/supabase/client';");
    expect(src).toContain("supabase\n        .from('email_send_log')");
  });
});

describe('Global send-transactional-email cleanliness (post E-Mail-10)', () => {
  const PATHS = [
    'src/pages/Contact.tsx',
    'src/pages/ContractDetail.tsx',
    'src/pages/dashboard/DashboardContracts.tsx',
    'src/pages/Membership.tsx',
    'src/components/membership/AdminUpgradeRequestsPanel.tsx',
    'src/components/booking/BookingWidget.tsx',
    'src/components/dashboard/business-edit/InvitationsPanel.tsx',
    'src/pages/admin/AdminProviderReview.tsx',
    'src/components/admin/email-center/EmailTemplatePreview.tsx',
    'src/services/auth/authService.ts',
  ];

  it.each(PATHS)('%s has no direct send-transactional-email invocation', (p) => {
    expect(read(p)).not.toMatch(DIRECT_INVOKE);
  });

  it('shared wrapper is the only direct caller in src/', () => {
    const { execSync } = require('child_process');
    const out = execSync(
      `grep -rln --exclude-dir=__tests__ "supabase.functions.invoke('send-transactional-email'" src/ || true`,
      { encoding: 'utf-8' },
    ).trim();
    const files = out ? out.split('\n').filter(Boolean) : [];
    expect(files).toEqual(['src/modules/notifications/services/sendTransactionalEmail.ts']);
  });
});