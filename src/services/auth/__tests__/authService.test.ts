import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const sendTransactionalEmailMock = vi.fn();
const invokeMock = vi.fn();

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      signInWithPassword: vi.fn(),
      signUp: vi.fn(),
      resetPasswordForEmail: vi.fn(),
      resend: vi.fn(),
      updateUser: vi.fn(),
      signOut: vi.fn(),
      setSession: vi.fn(),
    },
    functions: { invoke: (...args: unknown[]) => invokeMock(...args) },
    from: vi.fn(() => ({
      update: vi.fn(() => ({ eq: vi.fn(() => ({ error: null })) })),
      insert: vi.fn(() => ({ error: null })),
    })),
  },
}));

vi.mock('@/modules/notifications/services/sendTransactionalEmail', () => ({
  sendTransactionalEmail: (...args: unknown[]) => sendTransactionalEmailMock(...args),
}));

vi.mock('@/integrations/lovable/index', () => ({
  lovable: {
    auth: {
      signInWithOAuth: vi.fn(() => ({ error: null })),
    },
  },
}));

import { authService }  from '../authService';
import { supabase } from '@/integrations/supabase/client';

beforeEach(() => {
  sendTransactionalEmailMock.mockReset();
  invokeMock.mockReset();
  vi.mocked(supabase.auth.signUp).mockReset();
  vi.mocked(supabase.auth.signInWithPassword).mockReset();
  vi.mocked(supabase.from).mockReset();
});

describe('authService.signUp — welcome-signup email (E-Mail-3)', () => {
  const setupSignUp = (userId: string | null) => {
    vi.mocked(supabase.auth.signUp).mockResolvedValue({
      data: {
        user: userId ? { id: userId, identities: [{ id: 'id-1' }] } : null,
        session: null,
      },
      error: null,
    } as never);
  };

  it('calls sendTransactionalEmail with exact welcome-signup payload', async () => {
    setupSignUp('usr-123');
    sendTransactionalEmailMock.mockResolvedValue({ data: { sent: true }, error: null });

    await authService.signUp('test@example.com', 'password123', {
      full_name: 'Ali',
      account_type: 'individual',
      phone: '',
    });

    expect(sendTransactionalEmailMock).toHaveBeenCalledTimes(1);
    expect(sendTransactionalEmailMock).toHaveBeenCalledWith({
      templateName: 'welcome-signup',
      recipientEmail: 'test@example.com',
      idempotencyKey: 'welcome-usr-123',
      templateData: {
        fullName: 'Ali',
        dashboardUrl: 'http://localhost:3000/dashboard',
      },
    });
  });

  it('does not send email when user id is missing', async () => {
    setupSignUp(null);
    sendTransactionalEmailMock.mockResolvedValue({ data: null, error: null });

    await authService.signUp('test@example.com', 'password123', {});

    expect(sendTransactionalEmailMock).not.toHaveBeenCalled();
  });

  it('preserves fire-and-forget behavior when sendTransactionalEmail rejects', async () => {
    setupSignUp('usr-456');
    sendTransactionalEmailMock.mockRejectedValue(new Error('edge down'));

    const result = await authService.signUp('fail@example.com', 'password123', {
      full_name: 'Fail',
    });

    expect(sendTransactionalEmailMock).toHaveBeenCalledTimes(1);
    expect(result.user).toBeDefined();
    // signUp must not throw even though the email wrapper rejected
  });

  it('uses undefined for fullName when sanitizedMeta.full_name is empty', async () => {
    setupSignUp('usr-789');
    sendTransactionalEmailMock.mockResolvedValue({ data: null, error: null });

    await authService.signUp('empty@example.com', 'password123', { full_name: '' });

    const callArg = sendTransactionalEmailMock.mock.calls[0][1];
    expect(callArg?.templateData?.fullName).toBeUndefined();
  });
});

describe('authService.createBusiness — welcome-business email (E-Mail-3)', () => {
  const setupInsert = (error: Error | null = null) => {
    vi.mocked(supabase.from).mockReturnValue({
      insert: vi.fn(() => ({ error })),
    } as never);
  };

  it('calls sendTransactionalEmail with exact welcome-business payload', async () => {
    setupInsert(null);
    sendTransactionalEmailMock.mockResolvedValue({ data: { sent: true }, error: null });

    await authService.createBusiness('usr-999', 'My Business', 'mybiz', {
      recipientEmail: 'biz@example.com',
    });

    expect(sendTransactionalEmailMock).toHaveBeenCalledTimes(1);
    expect(sendTransactionalEmailMock).toHaveBeenCalledWith({
      templateName: 'welcome-business',
      recipientEmail: 'biz@example.com',
      idempotencyKey: 'welcome-business-usr-999',
      templateData: {
        businessName: 'My Business',
        dashboardUrl: 'http://localhost:3000/dashboard',
      },
    });
  });

  it('does not send email when insert errors', async () => {
    setupInsert(new Error('DB constraint'));
    sendTransactionalEmailMock.mockResolvedValue({ data: null, error: null });

    await expect(
      authService.createBusiness('usr-000', 'Biz', 'biz', {
        recipientEmail: 'biz@example.com',
      }),
    ).rejects.toThrow('DB constraint');

    expect(sendTransactionalEmailMock).not.toHaveBeenCalled();
  });

  it('does not send email when recipientEmail is missing', async () => {
    setupInsert(null);
    sendTransactionalEmailMock.mockResolvedValue({ data: null, error: null });

    await authService.createBusiness('usr-111', 'NoEmailBiz', 'noemail');

    expect(sendTransactionalEmailMock).not.toHaveBeenCalled();
  });

  it('preserves fire-and-forget behavior when sendTransactionalEmail rejects', async () => {
    setupInsert(null);
    sendTransactionalEmailMock.mockRejectedValue(new Error('queue full'));

    await authService.createBusiness('usr-222', 'Resilient', 'resilient', {
      recipientEmail: 'ok@example.com',
    });

    expect(sendTransactionalEmailMock).toHaveBeenCalledTimes(1);
    // createBusiness must not throw — error is swallowed by .catch()
  });

  it('uses undefined for businessName when sanitizedName is empty', async () => {
    setupInsert(null);
    sendTransactionalEmailMock.mockResolvedValue({ data: null, error: null });

    await authService.createBusiness('usr-333', '', 'emptyname', {
      recipientEmail: 'e@example.com',
    });

    const callArg = sendTransactionalEmailMock.mock.calls[0][0];
    expect(callArg?.templateData?.businessName).toBeUndefined();
  });
});

describe('authService.ts source regression (E-Mail-3)', () => {
  const src = readFileSync(
    resolve(__dirname, '../authService.ts'),
    'utf8',
  );

  it('no longer directly calls supabase.functions.invoke for send-transactional-email', () => {
    expect(src).not.toMatch(
      /supabase\.functions\.invoke\(\s*['"]send-transactional-email['"]/,
    );
  });

  it('imports sendTransactionalEmail from the shared wrapper', () => {
    expect(src).toMatch(
      /from ['"]@\/modules\/notifications\/services\/sendTransactionalEmail['"]/,
    );
  });

  it('uses sendTransactionalEmail for welcome-signup', () => {
    expect(src).toMatch(
      /sendTransactionalEmail\(\s*\{[^}]*templateName:\s*['"]welcome-signup['"]/,
    );
  });

  it('uses sendTransactionalEmail for welcome-business', () => {
    expect(src).toMatch(
      /sendTransactionalEmail\(\s*\{[^}]*templateName:\s*['"]welcome-business['"]/,
    );
  });

  it('preserves idempotencyKey for welcome-signup', () => {
    expect(src).toMatch(/idempotencyKey:\s*`welcome-\$\{userId\}`/);
  });

  it('preserves idempotencyKey for welcome-business', () => {
    expect(src).toMatch(/idempotencyKey:\s*`welcome-business-\$\{userId\}`/);
  });

  it('preserves fire-and-forget .catch swallow pattern', () => {
    const matches = src.match(/\.catch\(\(\)\s*=>\s*\{[^}]*swallow/g);
    expect(matches?.length).toBeGreaterThanOrEqual(2);
  });
});
