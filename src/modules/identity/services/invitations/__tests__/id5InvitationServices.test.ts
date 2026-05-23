import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { rpc: vi.fn() },
}));

import { supabase } from '@/integrations/supabase/client';
import {
  acceptClientInvitation,
  getStaffInvitationPreview,
  acceptStaffInvitation,
  listMyStaffInvitations,
} from '../index';

const rpcMock = supabase.rpc as unknown as Mock;
beforeEach(() => rpcMock.mockReset());

describe('acceptClientInvitation', () => {
  it('calls accept_client_invitation with exact params', async () => {
    rpcMock.mockResolvedValue({ data: { ok: true }, error: null });
    const res = await acceptClientInvitation({ _token: 'TKN' });
    expect(rpcMock).toHaveBeenCalledWith('accept_client_invitation', { _token: 'TKN' });
    expect(res).toEqual({ data: { ok: true }, error: null });
  });
});

describe('getStaffInvitationPreview', () => {
  it('calls get_staff_invitation_preview with exact params', async () => {
    rpcMock.mockResolvedValue({ data: [], error: null });
    await getStaffInvitationPreview({ _token: 'TKN' });
    expect(rpcMock).toHaveBeenCalledWith('get_staff_invitation_preview', { _token: 'TKN' });
  });
});

describe('acceptStaffInvitation', () => {
  it('calls accept_staff_invitation with exact params', async () => {
    rpcMock.mockResolvedValue({ data: { ok: true }, error: null });
    await acceptStaffInvitation({ _token: 'TKN' });
    expect(rpcMock).toHaveBeenCalledWith('accept_staff_invitation', { _token: 'TKN' });
  });
});

describe('listMyStaffInvitations', () => {
  it('calls get_my_staff_invitations with no args', async () => {
    rpcMock.mockResolvedValue({ data: [], error: null });
    await listMyStaffInvitations();
    expect(rpcMock).toHaveBeenCalledWith('get_my_staff_invitations');
  });

  it('passes through error raw', async () => {
    rpcMock.mockResolvedValue({ data: null, error: { message: 'x' } });
    const res = await listMyStaffInvitations();
    expect(res.error).toEqual({ message: 'x' });
  });
});