import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const invokeMock = vi.fn();

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    functions: { invoke: (...args: unknown[]) => invokeMock(...args) },
  },
}));

import { sendLeadTransactionalEmail } from '../sendLeadTransactionalEmail';

beforeEach(() => {
  invokeMock.mockReset();
});

describe('sendLeadTransactionalEmail', () => {
  it('calls send-transactional-email edge function with exact body payload', async () => {
    invokeMock.mockResolvedValue({ data: { sent: true }, error: null });
    const payload = {
      templateName: 'contract-draft-created-client',
      recipientEmail: 'client@example.com',
      idempotencyKey: 'key-1',
      templateData: { name: 'Ali', contractId: 'ct-123' },
    };
    const result = await sendLeadTransactionalEmail(payload);
    expect(invokeMock).toHaveBeenCalledTimes(1);
    expect(invokeMock).toHaveBeenCalledWith('send-transactional-email', {
      body: payload,
    });
    expect(result).toEqual({ data: { sent: true }, error: null });
  });

  it('passes payload without templateData when omitted', async () => {
    invokeMock.mockResolvedValue({ data: null, error: null });
    const payload = {
      templateName: 'test-template',
      recipientEmail: 'a@b.com',
      idempotencyKey: 'key-2',
    };
    await sendLeadTransactionalEmail(payload);
    expect(invokeMock).toHaveBeenCalledWith('send-transactional-email', {
      body: payload,
    });
  });

  it('returns the raw invoke result shape', async () => {
    invokeMock.mockResolvedValue({ data: { id: 'msg-1' }, error: null });
    const result = await sendLeadTransactionalEmail({
      templateName: 't',
      recipientEmail: 'x@y.com',
      idempotencyKey: 'k',
    });
    expect(result).toHaveProperty('data');
    expect(result).toHaveProperty('error');
  });

  it('bubbles up invoke errors exactly as supabase does', async () => {
    invokeMock.mockRejectedValue(new Error('edge function timeout'));
    await expect(
      sendLeadTransactionalEmail({
        templateName: 't',
        recipientEmail: 'x@y.com',
        idempotencyKey: 'k',
      }),
    ).rejects.toThrow('edge function timeout');
  });
});

describe('AdminLeadRequests.tsx regression (C5)', () => {
  const src = readFileSync(
    resolve(__dirname, '../../../../pages/admin/AdminLeadRequests.tsx'),
    'utf8',
  );

  it('no longer contains direct supabase.functions.invoke for send-transactional-email', () => {
    expect(src).not.toMatch(
      /supabase\.functions\.invoke\(\s*['"]send-transactional-email['"]/,
    );
  });

  it('uses sendLeadTransactionalEmail wrapper', () => {
    expect(src).toMatch(/sendLeadTransactionalEmail\(/);
  });

  it('uses sendLeadTransactionalEmail for client contract draft email', () => {
    expect(src).toMatch(
      /sendLeadTransactionalEmail\(\s*\{[^}]*templateName:\s*['"]contract-draft-created-client['"]/,
    );
  });

  it('uses sendLeadTransactionalEmail for provider contract draft email', () => {
    expect(src).toMatch(
      /sendLeadTransactionalEmail\(\s*\{[^}]*templateName:\s*['"]contract-draft-created-provider['"]/,
    );
  });

  it('preserves idempotencyKey patterns for client and provider', () => {
    expect(src).toMatch(/contract-draft-client-\$\{contractId\}/);
    expect(src).toMatch(/contract-draft-provider-\$\{contractId\}/);
  });

  it('preserves Promise.allSettled(sends) ordering and fail-soft semantics', () => {
    expect(src).toMatch(/await Promise\.allSettled\(sends\)/);
  });

  it('no longer contains direct businesses lookup (handled by D4 service)', () => {
    expect(src).not.toMatch(/\.from\(\s*['"]businesses['"]\s*\)/);
  });
});

describe('sendLeadTransactionalEmail delegation (E-Mail-2)', () => {
  const src = readFileSync(
    resolve(__dirname, '../sendLeadTransactionalEmail.ts'),
    'utf8',
  );

  it('no longer directly imports the supabase client', () => {
    expect(src).not.toMatch(/@\/integrations\/supabase\/client/);
  });

  it('delegates to the shared sendTransactionalEmail wrapper', () => {
    expect(src).toMatch(/from ['"]@\/modules\/notifications\/services\/sendTransactionalEmail['"]/);
    expect(src).toMatch(/sendTransactionalEmail\(payload\)/);
  });
});
