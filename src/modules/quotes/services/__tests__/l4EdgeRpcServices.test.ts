import { describe, it, expect, vi, beforeEach } from 'vitest';

const invokeMock = vi.fn();
const rpcMock = vi.fn();

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    functions: { invoke: (...args: unknown[]) => invokeMock(...args) },
    rpc: (...args: unknown[]) => rpcMock(...args),
  },
}));

import { adminRevealLeadContact } from '../adminRevealLeadContact';
import { matchQuoteRequest } from '../matchQuoteRequest';
import {
  prepareContractPrefillFromLead,
  getContractSourceLeadSummary,
} from '@/modules/contracts/services/leadRpcs';

beforeEach(() => {
  invokeMock.mockReset();
  rpcMock.mockReset();
});

describe('adminRevealLeadContact', () => {
  it('invokes admin-reveal-lead-contact with body and returns raw result', async () => {
    invokeMock.mockResolvedValue({ data: { success: true }, error: null });
    const body = { lead_id: 'l1', note: 'x', override_credit_check: true };
    const res = await adminRevealLeadContact(body);
    expect(invokeMock).toHaveBeenCalledWith('admin-reveal-lead-contact', { body });
    expect(res).toEqual({ data: { success: true }, error: null });
  });

  it('passes through { data, error } raw', async () => {
    invokeMock.mockResolvedValue({ data: null, error: { message: 'boom' } });
    const res = await adminRevealLeadContact({ lead_id: 'l1' });
    expect(res.error).toEqual({ message: 'boom' });
  });

  it('bubbles thrown errors', async () => {
    invokeMock.mockRejectedValue(new Error('net'));
    await expect(adminRevealLeadContact({ lead_id: 'l1' })).rejects.toThrow('net');
  });
});

describe('matchQuoteRequest', () => {
  it('invokes match-quote-request with body and returns raw result', async () => {
    invokeMock.mockResolvedValue({ data: { success: true, matched_count: 3 }, error: null });
    const body = { quote_request_id: 'q1', limit: 10 };
    const res = await matchQuoteRequest(body);
    expect(invokeMock).toHaveBeenCalledWith('match-quote-request', { body });
    expect(res.data).toEqual({ success: true, matched_count: 3 });
  });

  it('passes through { data, error } raw', async () => {
    invokeMock.mockResolvedValue({ data: null, error: { message: 'x' } });
    const res = await matchQuoteRequest({ quote_request_id: 'q', limit: 10 });
    expect(res.error).toEqual({ message: 'x' });
  });

  it('bubbles thrown errors', async () => {
    invokeMock.mockRejectedValue(new Error('net'));
    await expect(matchQuoteRequest({ quote_request_id: 'q', limit: 10 })).rejects.toThrow('net');
  });
});

describe('prepareContractPrefillFromLead', () => {
  it('calls rpc with exact name and params', async () => {
    rpcMock.mockResolvedValue({ data: { ok: 1 }, error: null });
    const res = await prepareContractPrefillFromLead({ _lead_id: 'L-1' });
    expect(rpcMock).toHaveBeenCalledWith('prepare_contract_prefill_from_lead', { _lead_id: 'L-1' });
    expect(res.data).toEqual({ ok: 1 });
  });

  it('passes through error and bubbles throws', async () => {
    rpcMock.mockResolvedValue({ data: null, error: { message: 'LEAD_PREFILL:NOT_FOUND' } });
    const res = await prepareContractPrefillFromLead({ _lead_id: 'x' });
    expect(res.error?.message).toBe('LEAD_PREFILL:NOT_FOUND');
    rpcMock.mockRejectedValue(new Error('net'));
    await expect(prepareContractPrefillFromLead({ _lead_id: 'x' })).rejects.toThrow('net');
  });
});

describe('getContractSourceLeadSummary', () => {
  it('calls rpc with exact name and params', async () => {
    rpcMock.mockResolvedValue({ data: { created_at: '2026-01-01' }, error: null });
    const res = await getContractSourceLeadSummary({ _contract_id: 'C-1' });
    expect(rpcMock).toHaveBeenCalledWith('get_contract_source_lead_summary', { _contract_id: 'C-1' });
    expect(res.data).toEqual({ created_at: '2026-01-01' });
  });

  it('passes through error and bubbles throws', async () => {
    rpcMock.mockResolvedValue({ data: null, error: { message: 'x' } });
    const res = await getContractSourceLeadSummary({ _contract_id: 'C-1' });
    expect(res.error).toEqual({ message: 'x' });
    rpcMock.mockRejectedValue(new Error('net'));
    await expect(getContractSourceLeadSummary({ _contract_id: 'C-1' })).rejects.toThrow('net');
  });
});