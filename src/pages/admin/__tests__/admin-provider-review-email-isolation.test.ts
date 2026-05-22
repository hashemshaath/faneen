import { describe, it, expect, vi }  from 'vitest';

const DIRECT_INVOKE = /supabase\.functions\.invoke\(\s*['"]send-transactional-email['"]\s*\)/;

function read(relativePath: string): string {
  const fs = require('fs');
  const path = require('path');
  const absolute = path.resolve(process.cwd(), relativePath);
  return fs.readFileSync(absolute, 'utf-8');
}

describe('AdminProviderReview email isolation (E-Mail-9)', () => {
  it('does not contain direct send-transactional-email invocations', () => {
    const src = read('src/pages/admin/AdminProviderReview.tsx');
    expect(src).not.toMatch(DIRECT_INVOKE);
  });

  it('imports sendTransactionalEmail from the shared wrapper', () => {
    const src = read('src/pages/admin/AdminProviderReview.tsx');
    expect(src).toContain("import { sendTransactionalEmail } from '@/modules/notifications/services/sendTransactionalEmail'");
  });

  it('preserves dynamic templateName source (copy.template)', () => {
    const src = read('src/pages/admin/AdminProviderReview.tsx');
    expect(src).toMatch(/templateName:\s*copy\.template/);
  });

  it('preserves idempotency key pattern', () => {
    const src = read('src/pages/admin/AdminProviderReview.tsx');
    expect(src).toContain('`provider-${vars.status}-${target.id}`');
  });

  it('preserves templateData shape (recipientName, businessName, username, notes)', () => {
    const src = read('src/pages/admin/AdminProviderReview.tsx');
    expect(src).toContain('recipientName:');
    expect(src).toContain('businessName:');
    expect(src).toContain('username:');
    expect(src).toContain('notes:');
  });

  it('preserves conditional notes inclusion logic', () => {
    const src = read('src/pages/admin/AdminProviderReview.tsx');
    expect(src).toContain("const includeNotes = vars.status === 'rejected' || vars.status === 'needs_changes';");
  });

  it('calls sendTransactionalEmail with await inside try/catch', () => {
    const src = read('src/pages/admin/AdminProviderReview.tsx');
    const callIndex = src.indexOf('sendTransactionalEmail({');
    expect(callIndex).toBeGreaterThan(-1);

    const before = src.slice(Math.max(0, callIndex - 200), callIndex);
    expect(before).toContain('try {');

    const after = src.slice(callIndex, callIndex + 600);
    expect(after).toContain('catch');
    expect(after).toContain("console.warn('[AdminProviderReview] email send failed', err);");
  });

  it('preserves ordering: DB update → analytics → notification insert → transactional email', () => {
    const src = read('src/pages/admin/AdminProviderReview.tsx');

    const dbIndex = src.indexOf("admin_update_business_approval");
    const analyticsIndex = src.indexOf('trackProviderApproved');
    const notifyIndex = src.indexOf("await supabase.from('notifications').insert");
    const emailIndex = src.indexOf('sendTransactionalEmail({');

    expect(dbIndex).toBeGreaterThan(-1);
    expect(analyticsIndex).toBeGreaterThan(-1);
    expect(notifyIndex).toBeGreaterThan(-1);
    expect(emailIndex).toBeGreaterThan(-1);

    expect(analyticsIndex).toBeGreaterThan(dbIndex);
    expect(notifyIndex).toBeGreaterThan(analyticsIndex);
    expect(emailIndex).toBeGreaterThan(notifyIndex);
  });

  it('preserves error-swallowing semantics for email failures', () => {
    const src = read('src/pages/admin/AdminProviderReview.tsx');
    const emailBlock = src.substring(
      src.indexOf('sendTransactionalEmail({') - 50,
      src.indexOf('sendTransactionalEmail({') + 900
    );
    expect(emailBlock).toContain('try {');
    expect(emailBlock).toContain('catch (err)');
    expect(emailBlock).toContain("console.warn('[AdminProviderReview] email send failed', err);");
    expect(emailBlock).not.toContain('throw');
  });

  it('preserves onSuccess toast and query invalidation', () => {
    const src = read('src/pages/admin/AdminProviderReview.tsx');
    expect(src).toContain('toast.success(');
    expect(src).toContain("qc.invalidateQueries({ queryKey: ['admin-provider-review'] })");
  });

  it('preserves onError toast behavior', () => {
    const src = read('src/pages/admin/AdminProviderReview.tsx');
    expect(src).toContain('toast.error(e instanceof Error ? e.message : \'Error\')');
  });

  it('does not contain raw return handling from supabase.functions.invoke', () => {
    const src = read('src/pages/admin/AdminProviderReview.tsx');
    // The original code ignored the return value; ensure we still don't destructure { data, error }
    const emailBlock = src.substring(
      src.indexOf('sendTransactionalEmail({') - 20,
      src.indexOf('sendTransactionalEmail({') + 600
    );
    expect(emailBlock).not.toMatch(/\bdata\b/);
    expect(emailBlock).not.toMatch(/\berror\b/);
  });

  it('EmailTemplatePreview remains deferred and untouched', () => {
    expect(read('src/components/admin/email-center/EmailTemplatePreview.tsx')).toMatch(DIRECT_INVOKE);
  });
});
