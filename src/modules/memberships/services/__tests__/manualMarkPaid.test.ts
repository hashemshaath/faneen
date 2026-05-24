import { describe, it, expect, vi, beforeEach } from 'vitest';

const rpcMock = vi.fn();
const fromMock = vi.fn();
const invokeMock = vi.fn();
const createNotifMock = vi.fn();
const sendEmailMock = vi.fn();

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    rpc: (...a: unknown[]) => rpcMock(...a),
    from: (t: string) => fromMock(t),
    functions: { invoke: (...a: unknown[]) => invokeMock(...a) },
  },
}));

vi.mock('@/modules/notifications/services/createNotification', () => ({
  createNotificationFireAndForget: (...a: unknown[]) => createNotifMock(...a),
}));

vi.mock('@/modules/notifications/services/sendTransactionalEmail', () => ({
  sendTransactionalEmail: (...a: unknown[]) => sendEmailMock(...a),
}));

import { markMembershipPaidManually } from '../payments/manualMarkPaid';

function mockSubscriptionFetch(planEn = 'Premium') {
  fromMock.mockImplementationOnce((table: string) => {
    expect(table).toBe('membership_subscriptions');
    return {
      select: () => ({
        eq: () => ({
          maybeSingle: () => Promise.resolve({
            data: {
              user_id: 'u1',
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
function mockProfileFetch(email: string | null = 'user@example.com') {
  fromMock.mockImplementationOnce((table: string) => {
    expect(table).toBe('profiles');
    return {
      select: () => ({
        eq: () => ({
          maybeSingle: () => Promise.resolve({
            data: { email, full_name: 'Test User' },
            error: null,
          }),
        }),
      }),
    };
  });
}

beforeEach(() => {
  rpcMock.mockReset();
  fromMock.mockReset();
  invokeMock.mockReset();
  createNotifMock.mockReset();
  sendEmailMock.mockReset();
});

describe('markMembershipPaidManually', () => {
  it('calls admin_mark_membership_paid_manually with exact named params', async () => {
    rpcMock.mockResolvedValue({ data: { ok: true, idempotent: true }, error: null });
    await markMembershipPaidManually({
      paymentIntentId: 'pi-1',
      adminUserId: 'admin-1',
      externalPaymentId: 'ext-1',
      invoiceId: 'INV-9',
      paidAt: '2026-05-24T00:00:00Z',
      notes: 'paid via bank transfer',
    });
    expect(rpcMock).toHaveBeenCalledWith('admin_mark_membership_paid_manually', {
      p_payment_intent_id: 'pi-1',
      p_admin_user_id: 'admin-1',
      p_external_payment_id: 'ext-1',
      p_invoice_id: 'INV-9',
      p_paid_at: '2026-05-24T00:00:00Z',
      p_notes: 'paid via bank transfer',
    });
  });

  it('defaults optional params to null', async () => {
    rpcMock.mockResolvedValue({ data: { ok: true, idempotent: true }, error: null });
    await markMembershipPaidManually({ paymentIntentId: 'pi-1', adminUserId: 'admin-1' });
    expect(rpcMock).toHaveBeenCalledWith('admin_mark_membership_paid_manually', {
      p_payment_intent_id: 'pi-1',
      p_admin_user_id: 'admin-1',
      p_external_payment_id: null,
      p_invoice_id: null,
      p_paid_at: null,
      p_notes: null,
    });
  });

  it('returns raw result + does NOT fire side effects on idempotent replay', async () => {
    rpcMock.mockResolvedValue({
      data: { ok: true, idempotent: true, payment_intent_id: 'pi-1', subscription_id: 's1', status: 'paid' },
      error: null,
    });
    const res = await markMembershipPaidManually({ paymentIntentId: 'pi-1', adminUserId: 'a' });
    expect(res.data?.ok).toBe(true);
    expect(res.data?.idempotent).toBe(true);
    expect(fromMock).not.toHaveBeenCalled();
    expect(createNotifMock).not.toHaveBeenCalled();
    expect(sendEmailMock).not.toHaveBeenCalled();
  });

  it('does NOT fire side effects when rpc returns error', async () => {
    rpcMock.mockResolvedValue({ data: null, error: { message: 'boom' } });
    const res = await markMembershipPaidManually({ paymentIntentId: 'pi-1', adminUserId: 'a' });
    expect(res.error).toEqual({ message: 'boom' });
    expect(createNotifMock).not.toHaveBeenCalled();
    expect(sendEmailMock).not.toHaveBeenCalled();
  });

  it('does NOT fire side effects on { ok:false } error code', async () => {
    rpcMock.mockResolvedValue({
      data: { ok: false, code: 'duplicate_payment_reference' }, error: null,
    });
    const res = await markMembershipPaidManually({ paymentIntentId: 'pi-1', adminUserId: 'a' });
    expect(res.data?.ok).toBe(false);
    expect(res.data?.code).toBe('duplicate_payment_reference');
    expect(createNotifMock).not.toHaveBeenCalled();
    expect(sendEmailMock).not.toHaveBeenCalled();
  });

  it('on first success dispatches notification + transactional email with stable idempotency key', async () => {
    rpcMock.mockResolvedValue({
      data: {
        ok: true, idempotent: false,
        payment_intent_id: 'pi-1', subscription_id: 's1',
        status: 'paid', paid_at: '2026-05-24T00:00:00Z',
      },
      error: null,
    });
    mockSubscriptionFetch('Premium');
    mockProfileFetch('user@example.com');

    await markMembershipPaidManually({ paymentIntentId: 'pi-1', adminUserId: 'a' });

    expect(createNotifMock).toHaveBeenCalledTimes(1);
    const [notif, tag] = createNotifMock.mock.calls[0];
    expect(notif.user_id).toBe('u1');
    expect(notif.notification_type).toBe('membership_payment_marked_paid');
    expect(notif.reference_type).toBe('membership_payment_intent');
    expect(notif.reference_id).toBe('pi-1');
    expect(notif.title_ar).toBeTruthy();
    expect(notif.title_en).toBeTruthy();
    expect(notif.body_ar).toBeTruthy();
    expect(notif.body_en).toBeTruthy();
    expect(typeof tag).toBe('string');

    expect(sendEmailMock).toHaveBeenCalledTimes(1);
    const [emailArg] = sendEmailMock.mock.calls[0];
    expect(emailArg.templateName).toBe('membership-payment-marked-paid');
    expect(emailArg.recipientEmail).toBe('user@example.com');
    expect(emailArg.idempotencyKey).toBe('mp-paid-pi-1');
    expect(emailArg.templateData.planName).toBe('Premium');
  });

  it('skips email when recipient has no email but still fires notification', async () => {
    rpcMock.mockResolvedValue({
      data: { ok: true, idempotent: false, payment_intent_id: 'pi-1', subscription_id: 's1', status: 'paid' },
      error: null,
    });
    mockSubscriptionFetch();
    mockProfileFetch(null);
    await markMembershipPaidManually({ paymentIntentId: 'pi-1', adminUserId: 'a' });
    expect(createNotifMock).toHaveBeenCalledTimes(1);
    expect(sendEmailMock).not.toHaveBeenCalled();
  });
});
