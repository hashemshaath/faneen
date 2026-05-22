import { describe, it, expect, vi, beforeEach } from 'vitest';

const rpcMock = vi.fn();
vi.mock('@/integrations/supabase/client', () => ({
  supabase: { rpc: (...args: unknown[]) => rpcMock(...args) },
}));

import { approveAmendment, rejectAmendment, cancelAmendment, applyAmendment } from '../amendments';

beforeEach(() => { rpcMock.mockReset(); });

describe('amendments service', () => {
  it('approveAmendment uses approve_contract_amendment', async () => {
    rpcMock.mockResolvedValueOnce({ data: null, error: null });
    const r = await approveAmendment('a1');
    expect(rpcMock).toHaveBeenCalledWith('approve_contract_amendment', { _amendment_id: 'a1' });
    expect(r).toBe('a1');
    rpcMock.mockResolvedValueOnce({ data: null, error: { message: 'x' } });
    await expect(approveAmendment('a1')).rejects.toMatchObject({ message: 'x' });
  });

  it('rejectAmendment passes _amendment_id and _reason', async () => {
    rpcMock.mockResolvedValueOnce({ data: null, error: null });
    const r = await rejectAmendment('a2', 'bad');
    expect(rpcMock).toHaveBeenCalledWith('reject_contract_amendment', { _amendment_id: 'a2', _reason: 'bad' });
    expect(r).toBe('a2');
    rpcMock.mockResolvedValueOnce({ data: null, error: { message: 'e' } });
    await expect(rejectAmendment('a2', 'r')).rejects.toMatchObject({ message: 'e' });
  });

  it('cancelAmendment uses cancel_contract_amendment', async () => {
    rpcMock.mockResolvedValueOnce({ data: null, error: null });
    expect(await cancelAmendment('a3')).toBe('a3');
    expect(rpcMock).toHaveBeenCalledWith('cancel_contract_amendment', { _amendment_id: 'a3' });
    rpcMock.mockResolvedValueOnce({ data: null, error: { message: 'e' } });
    await expect(cancelAmendment('a3')).rejects.toMatchObject({ message: 'e' });
  });

  it('applyAmendment uses apply_contract_amendment', async () => {
    rpcMock.mockResolvedValueOnce({ data: null, error: null });
    expect(await applyAmendment('a4')).toBe('a4');
    expect(rpcMock).toHaveBeenCalledWith('apply_contract_amendment', { _amendment_id: 'a4' });
    rpcMock.mockResolvedValueOnce({ data: null, error: { message: 'e' } });
    await expect(applyAmendment('a4')).rejects.toMatchObject({ message: 'e' });
  });
});