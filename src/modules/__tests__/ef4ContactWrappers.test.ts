import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const invokeMock = vi.fn();

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    functions: { invoke: invokeMock },
  },
}));

function read(p: string): string {
  return readFileSync(resolve(process.cwd(), p), 'utf8');
}

describe('EF-4 contact/email-ops edge function wrappers', () => {
  beforeEach(() => {
    invokeMock.mockReset();
    invokeMock.mockResolvedValue({ data: { ok: true }, error: null });
  });

  it('runWeeklySlaReport with no args invokes weekly-sla-report with no body', async () => {
    const { runWeeklySlaReport } = await import('@/modules/contact/services/weeklySlaReport');
    const res = await runWeeklySlaReport();
    expect(invokeMock).toHaveBeenCalledWith('weekly-sla-report');
    expect(invokeMock).toHaveBeenCalledTimes(1);
    expect(res).toEqual({ data: { ok: true }, error: null });
  });

  it('runWeeklySlaReport with payload invokes with { body: payload }', async () => {
    const { runWeeklySlaReport } = await import('@/modules/contact/services/weeklySlaReport');
    await runWeeklySlaReport({ dry_run: true });
    expect(invokeMock).toHaveBeenCalledWith('weekly-sla-report', { body: { dry_run: true } });
  });

  it('runWeeklySlaReport bubbles thrown errors', async () => {
    const { runWeeklySlaReport } = await import('@/modules/contact/services/weeklySlaReport');
    invokeMock.mockRejectedValueOnce(new Error('boom'));
    await expect(runWeeklySlaReport()).rejects.toThrow('boom');
  });

  it('triageContactMessage invokes triage-contact-message with body', async () => {
    const { triageContactMessage } = await import('@/modules/contact/services/triageContactMessage');
    const res = await triageContactMessage({ message_id: 'm1' });
    expect(invokeMock).toHaveBeenCalledWith('triage-contact-message', { body: { message_id: 'm1' } });
    expect(res).toEqual({ data: { ok: true }, error: null });
  });

  it('triageContactMessage passes through { data, error }', async () => {
    const { triageContactMessage } = await import('@/modules/contact/services/triageContactMessage');
    invokeMock.mockResolvedValueOnce({ data: null, error: { message: 'fail' } });
    const res = await triageContactMessage({ message_id: 'm2' });
    expect(res.error).toEqual({ message: 'fail' });
  });

  it('testContactWebhook invokes test-contact-webhook with body', async () => {
    const { testContactWebhook } = await import('@/modules/contact/services/testContactWebhook');
    await testContactWebhook({ override_url: 'https://x', override_secret: 's' });
    expect(invokeMock).toHaveBeenCalledWith('test-contact-webhook', {
      body: { override_url: 'https://x', override_secret: 's' },
    });
  });

  it('testContactWebhook bubbles thrown errors', async () => {
    const { testContactWebhook } = await import('@/modules/contact/services/testContactWebhook');
    invokeMock.mockRejectedValueOnce(new Error('net'));
    await expect(testContactWebhook({ override_url: 'u' })).rejects.toThrow('net');
  });

  it('handleEmailUnsubscribe invokes handle-email-unsubscribe with body', async () => {
    const { handleEmailUnsubscribe } = await import('@/modules/notifications/services/handleEmailUnsubscribe');
    await handleEmailUnsubscribe({ token: 'tok' });
    expect(invokeMock).toHaveBeenCalledWith('handle-email-unsubscribe', { body: { token: 'tok' } });
  });

  it('handleEmailUnsubscribe passes through { data, error }', async () => {
    const { handleEmailUnsubscribe } = await import('@/modules/notifications/services/handleEmailUnsubscribe');
    invokeMock.mockResolvedValueOnce({ data: { success: true }, error: null });
    const res = await handleEmailUnsubscribe({ token: 't' });
    expect(res).toEqual({ data: { success: true }, error: null });
  });
});

describe('EF-4 callsite migration', () => {
  const directWeekly = "supabase.functions.invoke('weekly-sla-report'";
  const directWeeklyDq = 'supabase.functions.invoke("weekly-sla-report"';
  const directTriage = "supabase.functions.invoke('triage-contact-message'";
  const directTriageDq = 'supabase.functions.invoke("triage-contact-message"';
  const directWebhook = "supabase.functions.invoke('test-contact-webhook'";
  const directWebhookDq = 'supabase.functions.invoke("test-contact-webhook"';
  const directUnsub = "supabase.functions.invoke('handle-email-unsubscribe'";
  const directUnsubDq = 'supabase.functions.invoke("handle-email-unsubscribe"';

  it('AdminContactMessages uses contact wrappers', () => {
    const src = read('src/pages/admin/AdminContactMessages.tsx');
    expect(src).not.toContain(directWeekly);
    expect(src).not.toContain(directWeeklyDq);
    expect(src).not.toContain(directTriage);
    expect(src).not.toContain(directTriageDq);
    expect(src).toContain('runWeeklySlaReport(');
    expect(src).toContain('triageContactMessage({ message_id: focused.id })');
  });

  it('AdminContactInboxSettings uses contact wrappers', () => {
    const src = read('src/pages/admin/AdminContactInboxSettings.tsx');
    expect(src).not.toContain(directWeekly);
    expect(src).not.toContain(directWeeklyDq);
    expect(src).not.toContain(directWebhook);
    expect(src).not.toContain(directWebhookDq);
    expect(src).toContain('runWeeklySlaReport(');
    expect(src).toContain('testContactWebhook(');
    // Preserve override_url/override_secret payload fields.
    expect(src).toContain('override_url: form.webhook_url');
    expect(src).toContain('override_secret: form.webhook_secret');
  });

  it('Unsubscribe page uses handleEmailUnsubscribe wrapper', () => {
    const src = read('src/pages/Unsubscribe.tsx');
    expect(src).not.toContain(directUnsub);
    expect(src).not.toContain(directUnsubDq);
    expect(src).toContain('handleEmailUnsubscribe({ token })');
    // Preserve public unsubscribe semantics.
    expect(src).toContain('already_unsubscribed');
    expect(src).toContain('setStatus("success")');
  });

  it('does not migrate EF-5 deferred edge functions', () => {
    const sitemap = read('src/components/admin/SitemapSubmissionsCard.tsx');
    expect(sitemap).toContain("functions.invoke('ping-search-engines'");
  });
});