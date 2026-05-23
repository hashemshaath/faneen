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

describe('EF-2 high-risk edge function wrappers', () => {
  beforeEach(() => {
    invokeMock.mockReset();
    invokeMock.mockResolvedValue({ data: { ok: true }, error: null });
  });

  it('notifyClientInvitation invokes notify-client-invitation with body', async () => {
    const { notifyClientInvitation } = await import(
      '@/modules/contracts/services/notifications/notifyClientInvitation'
    );
    const payload = { invite_id: 'inv_1', token: 'tok', kind: 'created' as const };
    const res = await notifyClientInvitation(payload);
    expect(invokeMock).toHaveBeenCalledWith('notify-client-invitation', { body: payload });
    expect(res).toEqual({ data: { ok: true }, error: null });
  });

  it('notifyClientInvitation bubbles thrown errors', async () => {
    const { notifyClientInvitation } = await import(
      '@/modules/contracts/services/notifications/notifyClientInvitation'
    );
    invokeMock.mockRejectedValueOnce(new Error('boom'));
    await expect(
      notifyClientInvitation({ invite_id: 'x', token: 'y', kind: 'reminder' }),
    ).rejects.toThrow('boom');
  });

  it('verifyPdfArabic invokes verify-pdf-arabic with body', async () => {
    const { verifyPdfArabic } = await import(
      '@/modules/contracts/services/pdf/verifyPdfArabic'
    );
    const payload = { pdfBase64: 'AAAA', fileName: 'c.pdf' };
    const res = await verifyPdfArabic(payload);
    expect(invokeMock).toHaveBeenCalledWith('verify-pdf-arabic', { body: payload });
    expect(res).toEqual({ data: { ok: true }, error: null });
  });

  it('getRevealedContact invokes get-revealed-contact with body', async () => {
    const { getRevealedContact } = await import(
      '@/modules/leads/services/getRevealedContact'
    );
    const res = await getRevealedContact({ lead_id: 'lead_1' });
    expect(invokeMock).toHaveBeenCalledWith('get-revealed-contact', {
      body: { lead_id: 'lead_1' },
    });
    expect(res).toEqual({ data: { ok: true }, error: null });
  });
});

describe('EF-2 callsite migration', () => {
  it('DashboardContracts uses notifyClientInvitation wrapper, no direct invoke', () => {
    const src = read('src/pages/dashboard/DashboardContracts.tsx');
    expect(src).not.toContain("supabase.functions.invoke('notify-client-invitation'");
    expect(src).not.toContain('supabase.functions.invoke("notify-client-invitation"');
    expect(src).toContain('notifyClientInvitation');
    expect(src).toContain("kind: 'created'");
    expect(src).toContain("kind: 'reminder'");
  });

  it('ContractDetail uses verifyPdfArabic wrapper, no direct invoke', () => {
    const src = read('src/pages/ContractDetail.tsx');
    expect(src).not.toContain("supabase.functions.invoke('verify-pdf-arabic'");
    expect(src).not.toContain('supabase.functions.invoke("verify-pdf-arabic"');
    expect(src).toContain('verifyPdfArabic({ pdfBase64, fileName })');
  });

  it('ProviderLeadDetails uses getRevealedContact wrapper, no direct invoke', () => {
    const src = read('src/pages/dashboard/ProviderLeadDetails.tsx');
    expect(src).not.toContain("functions.invoke('get-revealed-contact'");
    expect(src).not.toContain('functions.invoke("get-revealed-contact"');
    expect(src).toContain('getRevealedContact({ lead_id: lead.id })');
  });

  it('does not migrate EF-5 deferred edge functions', () => {
    // Spot-check: ping-search-engines remains direct (EF-5 SEO scope).
    const sitemap = read('src/components/admin/SitemapSubmissionsCard.tsx');
    expect(sitemap).toContain("functions.invoke('ping-search-engines'");
  });
});