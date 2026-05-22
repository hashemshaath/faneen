import { describe, it, expect, vi, beforeEach } from 'vitest';

const rpcMock = vi.fn();
vi.mock('@/integrations/supabase/client', () => ({
  supabase: { rpc: (...args: unknown[]) => rpcMock(...args) },
}));

import {
  acceptContract,
  sendContractForApproval,
  cloneContractAsDraft,
  recalcContractTotal,
  setContractExecutionSite,
  linkLeadToContract,
  completeContractFromInvitation,
} from '../mutations';

beforeEach(() => {
  rpcMock.mockReset();
});

describe('mutations service', () => {
  it('acceptContract calls accept_contract with _contract_id and throws on error', async () => {
    rpcMock.mockResolvedValueOnce({ data: { status: 'active' }, error: null });
    const r = await acceptContract('c1');
    expect(rpcMock).toHaveBeenCalledWith('accept_contract', { _contract_id: 'c1' });
    expect(r).toEqual({ status: 'active' });

    rpcMock.mockResolvedValueOnce({ data: null, error: { message: 'boom' } });
    await expect(acceptContract('c1')).rejects.toMatchObject({ message: 'boom' });
  });

  it('sendContractForApproval calls send_contract_for_approval and throws on error', async () => {
    rpcMock.mockResolvedValueOnce({ data: null, error: null });
    await sendContractForApproval('c2');
    expect(rpcMock).toHaveBeenCalledWith('send_contract_for_approval', { _contract_id: 'c2' });
    rpcMock.mockResolvedValueOnce({ data: null, error: { message: 'e' } });
    await expect(sendContractForApproval('c2')).rejects.toMatchObject({ message: 'e' });
  });

  it('cloneContractAsDraft passes source id + include flags and returns data', async () => {
    rpcMock.mockResolvedValueOnce({ data: { contract_id: 'new1' }, error: null });
    const r = await cloneContractAsDraft({ sourceContractId: 'src1' });
    expect(rpcMock).toHaveBeenCalledWith('clone_contract_as_draft', {
      _source_contract_id: 'src1',
      _include_line_items: true,
      _include_terms: true,
      _include_supervisor: true,
    });
    expect(r).toEqual({ contract_id: 'new1' });

    rpcMock.mockResolvedValueOnce({ data: null, error: { message: 'x' } });
    await expect(cloneContractAsDraft({ sourceContractId: 's' })).rejects.toMatchObject({ message: 'x' });
  });

  it('recalcContractTotal swallows errors and resolves', async () => {
    rpcMock.mockResolvedValueOnce({ data: null, error: { message: 'ignored' } });
    await expect(recalcContractTotal('c3')).resolves.toBeUndefined();
    expect(rpcMock).toHaveBeenCalledWith('recalc_contract_total', { _contract_id: 'c3' });
    rpcMock.mockRejectedValueOnce(new Error('thrown'));
    await expect(recalcContractTotal('c3')).resolves.toBeUndefined();
  });

  it('setContractExecutionSite maps null siteId to undefined', async () => {
    rpcMock.mockResolvedValueOnce({ data: null, error: null });
    await setContractExecutionSite('c4', null);
    expect(rpcMock).toHaveBeenCalledWith('set_contract_execution_site', {
      _contract_id: 'c4',
      _site_id: undefined,
    });
    rpcMock.mockResolvedValueOnce({ data: null, error: null });
    await setContractExecutionSite('c4', 'site1');
    expect(rpcMock).toHaveBeenLastCalledWith('set_contract_execution_site', {
      _contract_id: 'c4',
      _site_id: 'site1',
    });
  });

  it('linkLeadToContract uses _lead_id + _contract_id', async () => {
    rpcMock.mockResolvedValueOnce({ data: { ok: true }, error: null });
    await linkLeadToContract('c5', 'lead1');
    expect(rpcMock).toHaveBeenCalledWith('link_lead_to_contract', {
      _lead_id: 'lead1',
      _contract_id: 'c5',
    });
    rpcMock.mockResolvedValueOnce({ data: null, error: { message: 'L' } });
    await expect(linkLeadToContract('c5', 'lead1')).rejects.toMatchObject({ message: 'L' });
  });

  it('completeContractFromInvitation returns the new contract id string', async () => {
    rpcMock.mockResolvedValueOnce({ data: 'newC', error: null });
    const r = await completeContractFromInvitation('inv1');
    expect(rpcMock).toHaveBeenCalledWith('complete_contract_from_invitation', { _invite_id: 'inv1' });
    expect(r).toBe('newC');
    rpcMock.mockResolvedValueOnce({ data: null, error: { message: 'I' } });
    await expect(completeContractFromInvitation('inv1')).rejects.toMatchObject({ message: 'I' });
  });
});