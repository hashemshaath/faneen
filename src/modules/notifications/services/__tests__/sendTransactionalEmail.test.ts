import { describe, it, expect, vi, beforeEach } from 'vitest';

const invokeMock = vi.fn();

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    functions: { invoke: (...args: unknown[]) => invokeMock(...args) },
  },
}));

import { sendTransactionalEmail } from '../sendTransactionalEmail';

beforeEach(() => {
  invokeMock.mockReset();
});

describe('sendTransactionalEmail (shared wrapper)', () => {
  it('calls the send-transactional-email edge function by exact name', async () => {
    invokeMock.mockResolvedValue({ data: null, error: null });
    await sendTransactionalEmail({
      templateName: 't',
      recipientEmail: 'a@b.com',
      idempotencyKey: 'k',
    });
    expect(invokeMock).toHaveBeenCalledTimes(1);
    expect(invokeMock.mock.calls[0][0]).toBe('send-transactional-email');
  });

  it('passes the exact body payload verbatim (with templateData)', async () => {
    invokeMock.mockResolvedValue({ data: { sent: true }, error: null });
    const payload = {
      templateName: 'welcome',
      recipientEmail: 'user@example.com',
      idempotencyKey: 'idem-1',
      templateData: { name: 'Ada', orderId: 'o-1' },
    };
    await sendTransactionalEmail(payload);
    expect(invokeMock).toHaveBeenCalledWith('send-transactional-email', {
      body: payload,
    });
  });

  it('works when templateData is omitted', async () => {
    invokeMock.mockResolvedValue({ data: null, error: null });
    const payload = {
      templateName: 'plain',
      recipientEmail: 'x@y.com',
      idempotencyKey: 'idem-2',
    };
    await sendTransactionalEmail(payload);
    expect(invokeMock).toHaveBeenCalledWith('send-transactional-email', {
      body: payload,
    });
  });

  it('returns the raw { data, error } result unchanged', async () => {
    const raw = { data: { id: 'msg-1' }, error: null };
    invokeMock.mockResolvedValue(raw);
    const result = await sendTransactionalEmail({
      templateName: 't',
      recipientEmail: 'x@y.com',
      idempotencyKey: 'k',
    });
    expect(result).toBe(raw);
  });

  it('returns { data: null, error } unchanged when invoke reports error', async () => {
    const raw = { data: null, error: { message: 'boom' } };
    invokeMock.mockResolvedValue(raw);
    const result = await sendTransactionalEmail({
      templateName: 't',
      recipientEmail: 'x@y.com',
      idempotencyKey: 'k',
    });
    expect(result).toBe(raw);
  });

  it('bubbles thrown invoke errors exactly', async () => {
    invokeMock.mockRejectedValue(new Error('network down'));
    await expect(
      sendTransactionalEmail({
        templateName: 't',
        recipientEmail: 'x@y.com',
        idempotencyKey: 'k',
      }),
    ).rejects.toThrow('network down');
  });
});