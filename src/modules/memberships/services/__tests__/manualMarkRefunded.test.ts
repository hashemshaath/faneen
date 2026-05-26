import { describe, it, expect, vi, beforeEach } from 'vitest';

const rpcMock = vi.fn();
const fromMock = vi.fn();
const createNotifMock = vi.fn();
const sendEmailMock = vi.fn();
const getProfileByUserIdMock = vi.fn();

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    rpc: (...a: unknown[]) => rpcMock(...a),
    from: (t: string) => fromMock(t),
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

import { markMembershipRefundedManually } from '../payments/manualMarkRefunded';

function mockSubscriptionFetch(planEn = 'Premium') {
  fromMock.mockImplementationOnce((table: string) => {
    expect(table).toBe('membership_subscriptions');
    return {
      select: () => ({
        eq: () => ({
          maybeSingle: () => Promise.resolve({
            data: {
              user_id: 'u1',
              ref_id: 'PVS-1000045',
              last_paid_amount: 199,
              last_paid_currency: 'SAR',
              last_invoice_id: 'INV-1',
              plan: { name_ar: 'بريميوم', name_en: planEn },
            },
            error: null,
          }),
        }),
      }),
    };
  });
}
function mockPaymentIntentFetch(refId: string | null = 'PAY-1000123') {
  fromMock.mockImplementationOnce((table: string) => {
    expect(table).toBe('membership_payment_intents');
    return {
      select: () => ({
        eq: () => ({
          maybeSingle: () => Promise.resolve({
            data: { ref_id: refId, provider_intent_id: 'mys_abc123' },
            error: null,
          }),
        }),
      }),
    };
  });
}
function mockProfileFetch(email: string | null = 'user@example.com') {
  getProfileByUserIdMock.mockResolvedValueOnce({
    data: { email, full_name: 'Test User' },
    error: null,
  });
}

beforeEach(() => {
  rpcMock.mockReset();
  fromMock.mockReset();
  createNotifMock.mockReset();
  sendEmailMock.mockReset();
  getProfileByUserIdMock.mockReset();
});

describe('markMembershipRefundedManually', () => {
  it('calls admin_mark_membership_payment_refunded_manually with exact named params', async () => {
    rpcMock.mockResolvedValue({ data: { ok: true, idempotent: true }, error: null });
    await markMembershipRefundedManually({
      paymentIntentId: 'pi-1',
      adminUserId: 'admin-1',
      refundReference: 'REF-9',
      refundedAt: '2026-05-24T00:00:00Z',
      notes: 'partial credit',
    });
    expect(rpcMock).toHaveBeenCalledWith('admin_mark_membership_payment_refunded_manually', {
      p_payment_intent_id: 'pi-1',
      p_admin_user_id: 'admin-1',
      p_refund_reference: 'REF-9',
      p_refunded_at: '2026-05-24T00:00:00Z',
      p_notes: 'partial credit',
    });
  });

  it('defaults optional params to null', async () => {
    rpcMock.mockResolvedValue({ data: { ok: true, idempotent: true }, error: null });
    await markMembershipRefundedManually({ paymentIntentId: 'pi-1', adminUserId: 'admin-1' });
    expect(rpcMock).toHaveBeenCalledWith('admin_mark_membership_payment_refunded_manually', {
      p_payment_intent_id: 'pi-1',
      p_admin_user_id: 'admin-1',
      p_refund_reference: null,
      p_refunded_at: null,
      p_notes: null,
    });
  });

  it('passes raw rpc error through without throwing', async () => {
    rpcMock.mockResolvedValue({ data: null, error: { message: 'boom' } });
    const res = await markMembershipRefundedManually({ paymentIntentId: 'pi-1', adminUserId: 'a' });
    expect(res.error).toEqual({ message: 'boom' });
    expect(createNotifMock).not.toHaveBeenCalled();
    expect(sendEmailMock).not.toHaveBeenCalled();
  });

  it('does NOT fire side effects on idempotent replay', async () => {
    rpcMock.mockResolvedValue({
      data: { ok: true, idempotent: true, payment_intent_id: 'pi-1', subscription_id: 's1', status: 'refunded' },
      error: null,
    });
    await markMembershipRefundedManually({ paymentIntentId: 'pi-1', adminUserId: 'a' });
    expect(fromMock).not.toHaveBeenCalled();
    expect(createNotifMock).not.toHaveBeenCalled();
    expect(sendEmailMock).not.toHaveBeenCalled();
  });

  it('does NOT fire side effects on { ok:false, code:payment_not_paid }', async () => {
    rpcMock.mockResolvedValue({ data: { ok: false, code: 'payment_not_paid' }, error: null });
    const res = await markMembershipRefundedManually({ paymentIntentId: 'pi-1', adminUserId: 'a' });
    expect(res.data?.code).toBe('payment_not_paid');
    expect(createNotifMock).not.toHaveBeenCalled();
    expect(sendEmailMock).not.toHaveBeenCalled();
  });

  it('on first success dispatches notification + email with stable idempotency key', async () => {
    rpcMock.mockResolvedValue({
      data: {
        ok: true, idempotent: false,
        payment_intent_id: 'pi-1', subscription_id: 's1',
        status: 'refunded', refunded_at: '2026-05-24T00:00:00Z',
      },
      error: null,
    });
    mockPaymentIntentFetch('PAY-1000123');
    mockSubscriptionFetch('Premium');
    mockProfileFetch('user@example.com');

    await markMembershipRefundedManually({ paymentIntentId: 'pi-1', adminUserId: 'a' });

    expect(createNotifMock).toHaveBeenCalledTimes(1);
    const [notif] = createNotifMock.mock.calls[0];
    expect(notif.notification_type).toBe('membership_payment_marked_refunded');
    expect(notif.reference_type).toBe('membership_payment_intent');
    expect(notif.reference_id).toBe('pi-1');
    expect(notif.title_ar).toMatch(/استرداد/);
    expect(notif.title_en.toLowerCase()).toMatch(/refund/);

    expect(sendEmailMock).toHaveBeenCalledTimes(1);
    const [emailArg] = sendEmailMock.mock.calls[0];
    expect(emailArg.templateName).toBe('membership-payment-marked-refunded');
    expect(emailArg.recipientEmail).toBe('user@example.com');
    expect(emailArg.idempotencyKey).toBe('mp-refund-pi-1');
    // Step E: PAY + SUB official refs surfaced; provider_intent_id stays internal.
    expect(emailArg.templateData.paymentRef).toBe('PAY-1000123');
    expect(emailArg.templateData.subscriptionRef).toBe('PVS-1000045');
    expect(JSON.stringify(emailArg.templateData)).not.toContain('mys_abc123');
  });
});