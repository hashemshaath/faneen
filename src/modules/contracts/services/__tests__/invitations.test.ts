import { describe, it, expect, vi, beforeEach } from 'vitest';

const rpcMock = vi.fn();
vi.mock('@/integrations/supabase/client', () => ({
  supabase: { rpc: (...args: unknown[]) => rpcMock(...args) },
}));

import { createClientInvitation, resendClientInvitation, cancelClientInvitation } from '../invitations';

beforeEach(() => { rpcMock.mockReset(); });

describe('invitations service', () => {
  it('createClientInvitation maps all args with null defaults', async () => {
    rpcMock.mockResolvedValueOnce({ data: { invite_id: 'i1' }, error: null });
    const r = await createClientInvitation({ email: 'a@b.com' });
    expect(rpcMock).toHaveBeenCalledWith('create_client_invitation', {
      _email: 'a@b.com',
      _name: null,
      _phone: null,
      _business_id: null,
      _draft_payload: null,
      _template_version_id: null,
      _work_type: null,
    });
    expect(r).toEqual({ invite_id: 'i1' });
  });

  it('createClientInvitation forwards provided optional fields', async () => {
    rpcMock.mockResolvedValueOnce({ data: null, error: null });
    await createClientInvitation({
      email: 'x@y.com', name: 'N', phone: '+1', businessId: 'b1',
      draftPayload: { a: 1 }, templateVersionId: 'tv', workType: 'aluminum',
    });
    expect(rpcMock).toHaveBeenLastCalledWith('create_client_invitation', {
      _email: 'x@y.com',
      _name: 'N',
      _phone: '+1',
      _business_id: 'b1',
      _draft_payload: { a: 1 },
      _template_version_id: 'tv',
      _work_type: 'aluminum',
    });
  });

  it('createClientInvitation throws on error', async () => {
    rpcMock.mockResolvedValueOnce({ data: null, error: { message: 'e' } });
    await expect(createClientInvitation({ email: 'a@b.com' })).rejects.toMatchObject({ message: 'e' });
  });

  it('resendClientInvitation uses _id', async () => {
    rpcMock.mockResolvedValueOnce({ data: { token: 't' }, error: null });
    const r = await resendClientInvitation('inv1');
    expect(rpcMock).toHaveBeenCalledWith('resend_client_invitation', { _id: 'inv1' });
    expect(r).toEqual({ token: 't' });
    rpcMock.mockResolvedValueOnce({ data: null, error: { message: 'cooldown' } });
    await expect(resendClientInvitation('inv1')).rejects.toMatchObject({ message: 'cooldown' });
  });

  it('cancelClientInvitation uses _id and throws on error', async () => {
    rpcMock.mockResolvedValueOnce({ data: null, error: null });
    await cancelClientInvitation('inv2');
    expect(rpcMock).toHaveBeenCalledWith('cancel_client_invitation', { _id: 'inv2' });
    rpcMock.mockResolvedValueOnce({ data: null, error: { message: 'e' } });
    await expect(cancelClientInvitation('inv2')).rejects.toMatchObject({ message: 'e' });
  });
});