import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { execSync } from 'node:child_process';

const invokeMock = vi.fn();

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    functions: { invoke: invokeMock },
  },
}));

function read(p: string): string {
  return readFileSync(resolve(process.cwd(), p), 'utf8');
}

describe('EF-5 SEO/admin tooling edge function wrappers', () => {
  beforeEach(() => {
    invokeMock.mockReset();
    invokeMock.mockResolvedValue({ data: { ok: true }, error: null });
  });

  it('pingSearchEngines invokes ping-search-engines with body', async () => {
    const { pingSearchEngines } = await import('@/modules/seo/services/pingSearchEngines');
    const res = await pingSearchEngines({ url: 'https://x.test' });
    expect(invokeMock).toHaveBeenCalledWith('ping-search-engines', { body: { url: 'https://x.test' } });
    expect(res).toEqual({ data: { ok: true }, error: null });
  });

  it('pingSearchEngines bubbles thrown errors', async () => {
    const { pingSearchEngines } = await import('@/modules/seo/services/pingSearchEngines');
    invokeMock.mockRejectedValueOnce(new Error('boom'));
    await expect(pingSearchEngines({ source: 'manual' })).rejects.toThrow('boom');
  });

  it('auditSitemapStatus with no args invokes without body', async () => {
    const { auditSitemapStatus } = await import('@/modules/seo/services/auditSitemapStatus');
    await auditSitemapStatus();
    expect(invokeMock).toHaveBeenCalledWith('audit-sitemap-status');
  });

  it('auditSitemapStatus with payload invokes with { body: payload }', async () => {
    const { auditSitemapStatus } = await import('@/modules/seo/services/auditSitemapStatus');
    await auditSitemapStatus({ triggeredBy: 'manual' });
    expect(invokeMock).toHaveBeenCalledWith('audit-sitemap-status', { body: { triggeredBy: 'manual' } });
  });

  it('runSiteAudit with no args invokes without body', async () => {
    const { runSiteAudit } = await import('@/modules/seo/services/runSiteAudit');
    const res = await runSiteAudit();
    expect(invokeMock).toHaveBeenCalledWith('run-site-audit');
    expect(res).toEqual({ data: { ok: true }, error: null });
  });

  it('runSiteAudit passes through { data, error }', async () => {
    const { runSiteAudit } = await import('@/modules/seo/services/runSiteAudit');
    invokeMock.mockResolvedValueOnce({ data: null, error: { message: 'fail' } });
    const res = await runSiteAudit();
    expect(res.error).toEqual({ message: 'fail' });
  });

  it('abEvaluate with no args invokes ab-evaluate without body', async () => {
    const { abEvaluate } = await import('@/modules/admin/services/experiments/abEvaluate');
    await abEvaluate();
    expect(invokeMock).toHaveBeenCalledWith('ab-evaluate');
  });

  it('abEvaluate bubbles thrown errors', async () => {
    const { abEvaluate } = await import('@/modules/admin/services/experiments/abEvaluate');
    invokeMock.mockRejectedValueOnce(new Error('eval-boom'));
    await expect(abEvaluate()).rejects.toThrow('eval-boom');
  });
});

describe('EF-5 callsite migration', () => {
  const directPing = "supabase.functions.invoke('ping-search-engines'";
  const directPingDq = 'supabase.functions.invoke("ping-search-engines"';
  const directAudit = "supabase.functions.invoke('audit-sitemap-status'";
  const directAuditDq = 'supabase.functions.invoke("audit-sitemap-status"';
  const directRun = "supabase.functions.invoke('run-site-audit'";
  const directRunDq = 'supabase.functions.invoke("run-site-audit"';
  const directAb = "supabase.functions.invoke('ab-evaluate'";
  const directAbDq = 'supabase.functions.invoke("ab-evaluate"';

  it('AdminProviderLanding uses pingSearchEngines wrapper', () => {
    const src = read('src/pages/admin/AdminProviderLanding.tsx');
    expect(src).not.toContain(directPing);
    expect(src).not.toContain(directPingDq);
    expect(src).toContain("pingSearchEngines({ url: 'https://qitaat.com/for-providers' })");
  });

  it('SitemapSubmissionsCard uses pingSearchEngines wrapper', () => {
    const src = read('src/components/admin/SitemapSubmissionsCard.tsx');
    expect(src).not.toContain(directPing);
    expect(src).not.toContain(directPingDq);
    expect(src).toContain("pingSearchEngines({ source: 'manual' })");
  });

  it('AdminSitemapStatus uses auditSitemapStatus wrapper', () => {
    const src = read('src/pages/admin/AdminSitemapStatus.tsx');
    expect(src).not.toContain(directAudit);
    expect(src).not.toContain(directAuditDq);
    expect(src).toContain('auditSitemapStatus(');
    expect(src).toContain("triggeredBy: 'dashboard-fallback'");
    expect(src).toContain("triggeredBy: 'manual'");
  });

  it('AdminSiteAudit uses runSiteAudit wrapper', () => {
    const src = read('src/pages/admin/AdminSiteAudit.tsx');
    expect(src).not.toContain(directRun);
    expect(src).not.toContain(directRunDq);
    expect(src).toContain('runSiteAudit()');
  });

  it('AdminAbExperiments uses abEvaluate wrapper', () => {
    const src = read('src/pages/admin/AdminAbExperiments.tsx');
    expect(src).not.toContain(directAb);
    expect(src).not.toContain(directAbDq);
    expect(src).toContain('abEvaluate()');
  });

  it('no remaining unisolated functions.invoke callsites in src/ outside module wrappers and services/auth', () => {
    const out = execSync(
      "rg -n \"functions\\.invoke\\(['\\\"](ping-search-engines|audit-sitemap-status|run-site-audit|ab-evaluate|weekly-sla-report|triage-contact-message|test-contact-webhook|handle-email-unsubscribe|ai-center|blog-ai-tools|notify-client-invitation|verify-pdf-arabic|get-revealed-contact)\" src/ -g '!**/__tests__/**' || true",
      { encoding: 'utf8' },
    );
    const lines = out.split('\n').filter(Boolean);
    const offenders = lines.filter((l) => !l.includes('/modules/'));
    expect(offenders).toEqual([]);
  });
});