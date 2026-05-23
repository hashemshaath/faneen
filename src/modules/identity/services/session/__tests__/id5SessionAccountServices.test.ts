import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(),
      getUser: vi.fn(),
      signOut: vi.fn(),
      updateUser: vi.fn(),
    },
  },
}));

import { supabase } from '@/integrations/supabase/client';
import {
  getCurrentSession,
  getCurrentUser,
  signOutCurrentUser,
} from '../index';
import { updateUserPassword } from '../../account';

const getSessionMock = supabase.auth.getSession as unknown as Mock;
const getUserMock = supabase.auth.getUser as unknown as Mock;
const signOutMock = supabase.auth.signOut as unknown as Mock;
const updateUserMock = supabase.auth.updateUser as unknown as Mock;

beforeEach(() => {
  getSessionMock.mockReset();
  getUserMock.mockReset();
  signOutMock.mockReset();
  updateUserMock.mockReset();
});

describe('getCurrentSession', () => {
  it('calls supabase.auth.getSession() with no args', async () => {
    getSessionMock.mockResolvedValue({ data: { session: null }, error: null });
    const res = await getCurrentSession();
    expect(getSessionMock).toHaveBeenCalledWith();
    expect(res).toEqual({ data: { session: null }, error: null });
  });
});

describe('getCurrentUser', () => {
  it('calls supabase.auth.getUser() with no args', async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: 'u' } }, error: null });
    const res = await getCurrentUser();
    expect(getUserMock).toHaveBeenCalledWith();
    expect(res.data.user?.id).toBe('u');
  });
});

describe('signOutCurrentUser', () => {
  it('calls supabase.auth.signOut() with no args', async () => {
    signOutMock.mockResolvedValue({ error: null });
    const res = await signOutCurrentUser();
    expect(signOutMock).toHaveBeenCalledWith();
    expect(res).toEqual({ error: null });
  });
});

describe('updateUserPassword', () => {
  it('calls supabase.auth.updateUser({ password }) exactly', async () => {
    updateUserMock.mockResolvedValue({ data: { user: null }, error: null });
    await updateUserPassword('s3cret!');
    expect(updateUserMock).toHaveBeenCalledWith({ password: 's3cret!' });
    // Safety: no extra keys beyond { password }.
    expect(Object.keys(updateUserMock.mock.calls[0][0])).toEqual(['password']);
  });

  it('passes through error raw', async () => {
    updateUserMock.mockResolvedValue({ data: null, error: { message: 'weak' } });
    const res = await updateUserPassword('x');
    expect(res.error).toEqual({ message: 'weak' });
  });
});