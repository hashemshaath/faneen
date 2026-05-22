import { describe, it, expect, vi, beforeEach } from 'vitest';

const insertMock = vi.fn();
const fromMock = vi.fn((_table: string) => ({ insert: insertMock }));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: (table: string) => fromMock(table),
  },
}));

import {
  createNotification,
  createNotificationFireAndForget,
  type CreateNotificationPayload,
} from '../createNotification';

const flush = () => new Promise((r) => setTimeout(r, 0));

const basePayload: CreateNotificationPayload = {
  user_id: 'u-1',
  title_ar: 'عنوان',
  title_en: 'Title',
  notification_type: 'system',
};

beforeEach(() => {
  insertMock.mockReset();
  fromMock.mockClear();
});

describe('createNotification (shared wrapper)', () => {
  it('targets the exact "notifications" table name', async () => {
    insertMock.mockResolvedValue({ data: null, error: null });
    await createNotification(basePayload);
    expect(fromMock).toHaveBeenCalledTimes(1);
    expect(fromMock.mock.calls[0][0]).toBe('notifications');
  });

  it('passes the exact payload object to .insert() verbatim', async () => {
    insertMock.mockResolvedValue({ data: null, error: null });
    const payload: CreateNotificationPayload = {
      ...basePayload,
      body_ar: 'نص',
      body_en: 'Body',
      reference_type: 'contract',
      reference_id: 'c-1',
      action_url: '/contracts/c-1',
    };
    await createNotification(payload);
    expect(insertMock).toHaveBeenCalledTimes(1);
    expect(insertMock).toHaveBeenCalledWith(payload);
  });

  it('does not chain .select() on the insert', async () => {
    const chain = { select: vi.fn(), single: vi.fn() };
    insertMock.mockReturnValue(Object.assign(Promise.resolve({ data: null, error: null }), chain));
    await createNotification(basePayload);
    expect(chain.select).not.toHaveBeenCalled();
  });

  it('does not chain .single() on the insert', async () => {
    const chain = { select: vi.fn(), single: vi.fn() };
    insertMock.mockReturnValue(Object.assign(Promise.resolve({ data: null, error: null }), chain));
    await createNotification(basePayload);
    expect(chain.single).not.toHaveBeenCalled();
  });

  it('returns the raw insert result unchanged (success)', async () => {
    const raw = { data: [{ id: 'n-1' }], error: null, status: 201, statusText: 'Created' };
    insertMock.mockResolvedValue(raw);
    const result = await createNotification(basePayload);
    expect(result).toBe(raw);
  });

  it('returns the raw { error } shape unchanged WITHOUT throwing', async () => {
    const raw = { data: null, error: { message: 'RLS denied', code: '42501' } };
    insertMock.mockResolvedValue(raw);
    const result = await createNotification(basePayload);
    expect(result).toEqual(raw);
  });

  it('bubbles thrown Supabase errors verbatim', async () => {
    const boom = new Error('network down');
    insertMock.mockRejectedValue(boom);
    await expect(createNotification(basePayload)).rejects.toBe(boom);
  });

  it('does not validate or transform the payload (passes through extra-ish fields)', async () => {
    insertMock.mockResolvedValue({ data: null, error: null });
    const ref = { ...basePayload };
    await createNotification(ref);
    // Same object identity reaches .insert — no clone, no rewrite.
    expect(insertMock.mock.calls[0][0]).toBe(ref);
  });
});

describe('createNotificationFireAndForget', () => {
  it('returns undefined synchronously (not a Promise)', () => {
    insertMock.mockResolvedValue({ data: null, error: null });
    const ret = createNotificationFireAndForget(basePayload, '[test]');
    expect(ret).toBeUndefined();
  });

  it('delegates to createNotification with the exact payload', async () => {
    insertMock.mockResolvedValue({ data: null, error: null });
    createNotificationFireAndForget(basePayload, '[test]');
    await flush();
    expect(fromMock).toHaveBeenCalledWith('notifications');
    expect(insertMock).toHaveBeenCalledWith(basePayload);
  });

  it('swallows returned { error } and logs via console.warn with the tag', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const err = { message: 'denied' };
    insertMock.mockResolvedValue({ data: null, error: err });
    createNotificationFireAndForget(basePayload, '[ContractMilestone]');
    await flush();
    expect(warn).toHaveBeenCalledWith('[ContractMilestone]', err);
    warn.mockRestore();
  });

  it('swallows thrown errors and logs via console.warn with the tag', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const boom = new Error('boom');
    insertMock.mockRejectedValue(boom);
    createNotificationFireAndForget(basePayload, '[ContractPayment]');
    await flush();
    expect(warn).toHaveBeenCalledWith('[ContractPayment]', boom);
    warn.mockRestore();
  });

  it('does not call console.warn on success', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    insertMock.mockResolvedValue({ data: [{ id: 'n-1' }], error: null });
    createNotificationFireAndForget(basePayload, '[ok]');
    await flush();
    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
  });
});