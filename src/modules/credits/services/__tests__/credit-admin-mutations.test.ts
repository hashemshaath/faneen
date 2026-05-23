import { describe, it, expect, vi, beforeEach } from 'vitest';

const rpcMock = vi.fn();

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    rpc: (name: string, args: unknown) => rpcMock(name, args),
  },
}));

import { adminAdjustProviderCredits } from '../admin/mutations';

beforeEach(() => {
  rpcMock.mockReset();
});

describe('CRED-3 adminAdjustProviderCredits', () => {
  it('calls supabase.rpc with admin_adjust_provider_credits and args verbatim', async () => {
    rpcMock.mockResolvedValueOnce({ data: { ok: true }, error: null });
    const args = {
      p_subscription_id: 's1',
      p_action: 'grant' as const,
      p_amount: 5,
      p_reason: 'admin_manual_grant',
      p_note: 'note',
      p_quote_request_lead_id: null,
    };
    const res = await adminAdjustProviderCredits(args);
    expect(rpcMock).toHaveBeenCalledWith('admin_adjust_provider_credits', args);
    expect(res).toEqual({ data: { ok: true }, error: null });
  });

  it('returns raw { data, error } shape unchanged on error', async () => {
    rpcMock.mockResolvedValueOnce({ data: null, error: { message: 'boom' } });
    const res = await adminAdjustProviderCredits({
      p_subscription_id: 's',
      p_action: 'refund',
      p_amount: 1,
      p_reason: 'r',
      p_note: null,
      p_quote_request_lead_id: null,
    });
    expect(res).toEqual({ data: null, error: { message: 'boom' } });
  });
});