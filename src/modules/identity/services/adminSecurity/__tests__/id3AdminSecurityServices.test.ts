import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { functions: { invoke: vi.fn() } },
}));

import { supabase } from '@/integrations/supabase/client';
import { adminResetPassword, adminDeleteUser } from '../index';

const invokeMock = supabase.functions.invoke as unknown as Mock;

beforeEach(() => invokeMock.mockReset());

describe('adminResetPassword', () => {
  it('invokes admin-reset-password with change_password payload', async () => {
    invokeMock.mockResolvedValue({ data: { ok: true }, error: null });
    const res = await adminResetPassword({ target_user_id: 'u1', action: 'change_password', new_password: 'pw' });
    expect(invokeMock).toHaveBeenCalledWith('admin-reset-password', {
      body: { target_user_id: 'u1', action: 'change_password', new_password: 'pw' },
    });
    expect(res).toEqual({ data: { ok: true }, error: null });
  });

  it('invokes admin-reset-password with send_reset_link payload', async () => {
    invokeMock.mockResolvedValue({ data: null, error: null });
    await adminResetPassword({ target_user_id: 'u1', action: 'send_reset_link' });
    expect(invokeMock).toHaveBeenCalledWith('admin-reset-password', {
      body: { target_user_id: 'u1', action: 'send_reset_link' },
    });
  });

  it('passes through { data, error } raw', async () => {
    const err = new Error('x');
    invokeMock.mockResolvedValue({ data: null, error: err });
    const res = await adminResetPassword({ target_user_id: 'u', action: 'send_reset_link' });
    expect(res.error).toBe(err);
  });

  // Note: bubbling-error coverage is implicit — adminResetPassword returns the
  // raw invoke promise without try/catch, so any reject naturally propagates.
});

describe('adminDeleteUser', () => {
  it('invokes admin-delete-user with exact payload', async () => {
    invokeMock.mockResolvedValue({ data: { ok: true }, error: null });
    const res = await adminDeleteUser({ target_user_id: 'u1' });
    expect(invokeMock).toHaveBeenCalledWith('admin-delete-user', {
      body: { target_user_id: 'u1' },
    });
    expect(res).toEqual({ data: { ok: true }, error: null });
  });

  it('passes through error raw', async () => {
    invokeMock.mockResolvedValue({ data: null, error: { message: 'no' } });
    const res = await adminDeleteUser({ target_user_id: 'u1' });
    expect(res.error).toEqual({ message: 'no' });
  });
});