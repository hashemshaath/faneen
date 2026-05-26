import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * BM-REF-REBUILD-1 — Step G
 *
 * Guards that membership paid/refunded dispatchers route both the in-app
 * notification action_url and the email dashboardUrl through `/r/{PAY}` when
 * the official payment ref_id is available, and fall back to `/membership`
 * only when it is not. No UUID, token, or provider_intent_id may appear in
 * outbound URLs.
 */

const read = (p: string) => readFileSync(resolve(p), 'utf8');

describe('Step G — manual mark paid/refunded use /r/{PAY} when available', () => {
  const PAID = read('src/modules/memberships/services/payments/manualMarkPaid.ts');
  const REFUNDED = read('src/modules/memberships/services/payments/manualMarkRefunded.ts');

  it('paid dispatcher computes actionUrl from paymentRef with /membership fallback', () => {
    expect(PAID).toMatch(/paymentRef\s*\?\s*`\/r\/\$\{paymentRef\}`\s*:\s*['"]\/membership['"]/);
  });

  it('refunded dispatcher computes actionUrl from paymentRef with /membership fallback', () => {
    expect(REFUNDED).toMatch(/paymentRef\s*\?\s*`\/r\/\$\{paymentRef\}`\s*:\s*['"]\/membership['"]/);
  });

  it('dispatchers do not embed UUID, provider_intent_id, or invitation token in URLs', () => {
    for (const src of [PAID, REFUNDED]) {
      expect(src).not.toMatch(/\/r\/\$\{[^}]*provider_intent_id/);
      expect(src).not.toMatch(/\/r\/\$\{[^}]*paymentIntentId\}/);
      expect(src).not.toMatch(/\/r\/\$\{[^}]*token/i);
    }
  });

  it('coverage doc exists for Step G', () => {
    const doc = read('docs/reference-resolver-coverage.md');
    expect(doc).toContain('BM-REF Step G');
    expect(doc).toContain('PAY');
    expect(doc).toContain('/r/{PAY}');
  });
});

// ------------------------------------------------------------------
// Behavioural test: PAY ref present => /r/PAY in both surfaces.
// ------------------------------------------------------------------
const rpcMock = vi.fn();
const fromMock = vi.fn();
const createNotifMock = vi.fn();
const sendEmailMock = vi.fn();
const getProfileByUserIdMock = vi.fn();

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    rpc: (...a: unknown[]) => rpcMock(...a),
    from: (t: string) => fromMock(t),
    functions: { invoke: vi.fn() },
  },
}));
vi.mock('@/modules/notifications/services/createNotification', () => ({
  createNotificationFireAndForget: (...a: unknown[]) => createNotifMock(...a),
}));
vi.mock('@/modules/notifications/services/sendTransactionalEmail', () => ({
  sendTransactionalEmail: (...a: unknown[]) => sendEmailMock(...a),
}));
vi.mock('@/modules/users', () => ({
  getProfileByUserId: (...a: unknown[]) => getProfileByUserIdMock(...a),
}));

import { markMembershipPaidManually } from '@/modules/memberships/services/payments/manualMarkPaid';
import { markMembershipRefundedManually } from '@/modules/memberships/services/payments/manualMarkRefunded';

function mockIntent(ref: string | null) {
  fromMock.mockImplementationOnce(() => ({
    select: () => ({ eq: () => ({ maybeSingle: () =>
      Promise.resolve({ data: { ref_id: ref, provider_intent_id: 'mys_secret' }, error: null }) }) }),
  }));
}
function mockSub() {
  fromMock.mockImplementationOnce(() => ({
    select: () => ({ eq: () => ({ maybeSingle: () => Promise.resolve({
      data: {
        user_id: 'u1', ref_id: 'PVS-1000045',
        last_paid_amount: 199, last_paid_currency: 'SAR', last_invoice_id: 'INV-1',
        plan: { name_ar: 'بريميوم', name_en: 'Premium' },
      }, error: null,
    }) }) }),
  }));
}
function mockProfile(email: string | null = 'user@example.com') {
  getProfileByUserIdMock.mockResolvedValueOnce({
    data: { email, full_name: 'Test User' }, error: null,
  });
}

beforeEach(() => {
  rpcMock.mockReset(); fromMock.mockReset();
  createNotifMock.mockReset(); sendEmailMock.mockReset();
  getProfileByUserIdMock.mockReset();
});

describe('Step G — runtime behaviour: paid', () => {
  it('uses /r/PAY-… when paymentRef resolves', async () => {
    rpcMock.mockResolvedValue({ data: {
      ok: true, idempotent: false, payment_intent_id: 'pi-1',
      subscription_id: 's1', status: 'paid', paid_at: '2026-05-24T00:00:00Z',
    }, error: null });
    mockIntent('PAY-1000123'); mockSub(); mockProfile();
    await markMembershipPaidManually({ paymentIntentId: 'pi-1', adminUserId: 'a' });
    expect(createNotifMock.mock.calls[0][0].action_url).toBe('/r/PAY-1000123');
    expect(sendEmailMock.mock.calls[0][0].templateData.dashboardUrl).toBe('/r/PAY-1000123');
    const serialized = JSON.stringify(sendEmailMock.mock.calls[0][0]);
    expect(serialized).not.toContain('mys_secret');
    expect(serialized).not.toContain('pi-1/'); // no UUID in url
  });

  it('falls back to /membership when paymentRef is null', async () => {
    rpcMock.mockResolvedValue({ data: {
      ok: true, idempotent: false, payment_intent_id: 'pi-2',
      subscription_id: 's1', status: 'paid', paid_at: '2026-05-24T00:00:00Z',
    }, error: null });
    mockIntent(null); mockSub(); mockProfile();
    await markMembershipPaidManually({ paymentIntentId: 'pi-2', adminUserId: 'a' });
    expect(createNotifMock.mock.calls[0][0].action_url).toBe('/membership');
    expect(sendEmailMock.mock.calls[0][0].templateData.dashboardUrl).toBe('/membership');
  });
});

describe('Step G — runtime behaviour: refunded', () => {
  it('uses /r/PAY-… when paymentRef resolves', async () => {
    rpcMock.mockResolvedValue({ data: {
      ok: true, idempotent: false, payment_intent_id: 'pi-1',
      subscription_id: 's1', status: 'refunded', refunded_at: '2026-05-24T00:00:00Z',
    }, error: null });
    mockIntent('PAY-1000123'); mockSub(); mockProfile();
    await markMembershipRefundedManually({ paymentIntentId: 'pi-1', adminUserId: 'a' });
    expect(createNotifMock.mock.calls[0][0].action_url).toBe('/r/PAY-1000123');
    expect(sendEmailMock.mock.calls[0][0].templateData.dashboardUrl).toBe('/r/PAY-1000123');
  });

  it('falls back to /membership when paymentRef is null', async () => {
    rpcMock.mockResolvedValue({ data: {
      ok: true, idempotent: false, payment_intent_id: 'pi-2',
      subscription_id: 's1', status: 'refunded', refunded_at: '2026-05-24T00:00:00Z',
    }, error: null });
    mockIntent(null); mockSub(); mockProfile();
    await markMembershipRefundedManually({ paymentIntentId: 'pi-2', adminUserId: 'a' });
    expect(createNotifMock.mock.calls[0][0].action_url).toBe('/membership');
    expect(sendEmailMock.mock.calls[0][0].templateData.dashboardUrl).toBe('/membership');
  });
});

describe('Step G — resolver maps payment_intent fallback', () => {
  it('ReferenceResolver has explicit /membership fallback for payment_intent', () => {
    const src = read('src/pages/ReferenceResolver.tsx');
    expect(src).toMatch(/case\s+['"]payment_intent['"]\s*:\s*\n?\s*return\s+`?['"]\/membership/);
  });
});