import { describe, it, expect, vi, beforeEach } from 'vitest';

const insertMock = vi.fn();
const fromMock = vi.fn();
const getUserMock = vi.fn();

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: (...args: unknown[]) => fromMock(...args),
    auth: {
      getUser: (...args: unknown[]) => getUserMock(...args),
    },
  },
}));

import {
  notifyContractStatusChange,
  resolveContractNotificationRecipients,
} from '../modules/contracts/services/notifications/notifyContractStatusChange';

beforeEach(() => {
  insertMock.mockReset();
  fromMock.mockReset();
  getUserMock.mockReset();
  fromMock.mockReturnValue({ insert: insertMock });
  insertMock.mockResolvedValue({ data: null, error: null });
  getUserMock.mockResolvedValue({ data: { user: { id: 'actor-user' } } });
});

describe('CONTRACT STATUS NOTIFICATIONS PHASE 1', () => {
  it('excludes the actor from recipients', () => {
    const recipients = resolveContractNotificationRecipients(
      { id: 'c1', provider_id: 'u-provider', client_id: 'u-client' },
      'u-provider',
    );
    expect(recipients).toEqual(['u-client']);
  });

  it('does not notify a user not linked to the contract', () => {
    const recipients = resolveContractNotificationRecipients(
      { id: 'c1', provider_id: 'u-provider', client_id: 'u-client' },
      'unrelated-user',
    );
    expect(recipients.sort()).toEqual(['u-client', 'u-provider'].sort());
    expect(recipients).not.toContain('unrelated-user');
  });

  it('deduplicates when provider_id === client_id', () => {
    const recipients = resolveContractNotificationRecipients(
      { id: 'c1', provider_id: 'same-user', client_id: 'same-user' },
      null,
    );
    expect(recipients).toEqual(['same-user']);
  });

  it('sent_for_review notifies the other party with action_url to contract details', async () => {
    const res = await notifyContractStatusChange({
      contract: {
        id: 'c-42',
        title_ar: 'عقد توريد',
        title_en: 'Supply Contract',
        provider_id: 'actor-user',
        client_id: 'client-user',
      },
      event: 'sent_for_review',
    });
    expect(res.recipients).toEqual(['client-user']);
    expect(fromMock).toHaveBeenCalledWith('notifications');
    expect(insertMock).toHaveBeenCalledTimes(1);
    const payload = insertMock.mock.calls[0][0];
    expect(payload.user_id).toBe('client-user');
    expect(payload.action_url).toBe('/contracts/c-42');
    expect(payload.reference_type).toBe('contract');
    expect(payload.reference_id).toBe('c-42');
    expect(payload.notification_type).toBe('contract');
    // Uses "الطرف الثاني" terminology, not "العميل".
    expect(payload.title_ar).toContain('الطرف الثاني');
    expect(payload.title_ar).not.toContain('العميل');
  });

  it('approved_first_party uses "الطرف الأول" terminology', async () => {
    await notifyContractStatusChange({
      contract: {
        id: 'c-9',
        title_ar: 'عقد',
        title_en: 'Contract',
        provider_id: 'p1',
        client_id: 'actor-user',
      },
      event: 'approved_first_party',
    });
    const payload = insertMock.mock.calls[0][0];
    expect(payload.user_id).toBe('p1');
    expect(payload.title_ar).toContain('الطرف الأول');
    expect(payload.title_ar).not.toContain('العميل');
  });

  it('updated event inserts a row for the non-actor party', async () => {
    await notifyContractStatusChange({
      contract: {
        id: 'c-7',
        title_ar: 'عقد',
        title_en: 'Contract',
        provider_id: 'actor-user',
        client_id: 'client-user',
      },
      event: 'updated',
    });
    expect(insertMock).toHaveBeenCalledTimes(1);
    expect(insertMock.mock.calls[0][0].user_id).toBe('client-user');
    expect(insertMock.mock.calls[0][0].title_ar).toMatch(/تحديث/);
  });

  it('skips insert when there are no linked parties', async () => {
    const res = await notifyContractStatusChange({
      contract: { id: 'c-empty', provider_id: null, client_id: null },
      event: 'sent_for_review',
    });
    expect(res.recipients).toEqual([]);
    expect(insertMock).not.toHaveBeenCalled();
  });

  it('only writes via the notifications table (no service_role / RPC / edge surface)', async () => {
    await notifyContractStatusChange({
      contract: {
        id: 'c-1',
        provider_id: 'actor-user',
        client_id: 'client-user',
      },
      event: 'sent_for_review',
    });
    const tablesTouched = fromMock.mock.calls.map((c) => c[0]);
    expect(new Set(tablesTouched)).toEqual(new Set(['notifications']));
  });
});