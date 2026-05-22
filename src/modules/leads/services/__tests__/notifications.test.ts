import { describe, it, expect, vi, beforeEach } from 'vitest';

const invokeMock = vi.fn();

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { functions: { invoke: (...args: unknown[]) => invokeMock(...args) } },
}));

import { notifySupplierLead } from '../notifications';

beforeEach(() => {
  invokeMock.mockReset();
});

describe('notifySupplierLead', () => {
  it('invokes notify-supplier-lead with lead_id body', () => {
    invokeMock.mockResolvedValue({ data: null, error: null });
    const result = notifySupplierLead('abc-123');
    expect(result).toBeUndefined();
    expect(invokeMock).toHaveBeenCalledWith('notify-supplier-lead', {
      body: { lead_id: 'abc-123' },
    });
  });

  it('does not throw when invoke rejects (fire-and-forget)', async () => {
    invokeMock.mockRejectedValue(new Error('network down'));
    expect(() => notifySupplierLead('xyz')).not.toThrow();
    // Let microtasks settle; unhandled rejection would not surface as throw here.
    await Promise.resolve();
  });

  it('does not throw when invoke itself throws synchronously', () => {
    invokeMock.mockImplementation(() => { throw new Error('boom'); });
    expect(() => notifySupplierLead('xyz')).not.toThrow();
  });
});