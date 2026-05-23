import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    functions: { invoke: vi.fn() },
    auth: { verifyOtp: vi.fn() },
  },
}));

import { supabase } from '@/integrations/supabase/client';
import { createTempCodeSession, verifyTemporaryCodeOtp } from '../index';

const invokeMock = supabase.functions.invoke as unknown as Mock;
const verifyOtpMock = supabase.auth.verifyOtp as unknown as Mock;

beforeEach(() => {
  invokeMock.mockReset();
  verifyOtpMock.mockReset();
});

describe('createTempCodeSession', () => {
  it('invokes temp-code-session with exact body', async () => {
    invokeMock.mockResolvedValue({ data: { ok: true }, error: null });
    const res = await createTempCodeSession({ identifier: 'a@b.com', code: '123456' });
    expect(invokeMock).toHaveBeenCalledWith('temp-code-session', {
      body: { identifier: 'a@b.com', code: '123456' },
    });
    expect(res).toEqual({ data: { ok: true }, error: null });
  });

  it('passes through error raw', async () => {
    invokeMock.mockResolvedValue({ data: null, error: { message: 'x' } });
    const res = await createTempCodeSession({ identifier: 'x', code: 'y' });
    expect(res.error).toEqual({ message: 'x' });
  });
});

describe('verifyTemporaryCodeOtp', () => {
  it('calls auth.verifyOtp with token_hash + magiclink type', async () => {
    verifyOtpMock.mockResolvedValue({ data: { session: null }, error: null });
    await verifyTemporaryCodeOtp({ token_hash: 'TH', type: 'magiclink' });
    expect(verifyOtpMock).toHaveBeenCalledWith({ token_hash: 'TH', type: 'magiclink' });
  });

  it('defaults type to magiclink when omitted', async () => {
    verifyOtpMock.mockResolvedValue({ data: { session: null }, error: null });
    await verifyTemporaryCodeOtp({ token_hash: 'TH' });
    expect(verifyOtpMock).toHaveBeenCalledWith({ token_hash: 'TH', type: 'magiclink' });
  });

  it('passes through error raw', async () => {
    verifyOtpMock.mockResolvedValue({ data: null, error: { message: 'invalid' } });
    const res = await verifyTemporaryCodeOtp({ token_hash: 'TH' });
    expect(res.error).toEqual({ message: 'invalid' });
  });
});