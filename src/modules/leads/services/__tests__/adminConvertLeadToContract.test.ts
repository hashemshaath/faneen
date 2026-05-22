import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const rpcMock = vi.fn();

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { rpc: (...args: unknown[]) => rpcMock(...args) },
}));

import { adminConvertLeadToContract } from '../adminConvertLeadToContract';

beforeEach(() => {
  rpcMock.mockReset();
});

describe('adminConvertLeadToContract', () => {
  it('calls the exact RPC name admin_convert_lead_to_contract with _lead_id param', async () => {
    rpcMock.mockResolvedValue({ data: 'contract-id-123', error: null });
    const result = await adminConvertLeadToContract('lead-1');
    expect(rpcMock).toHaveBeenCalledWith('admin_convert_lead_to_contract', { _lead_id: 'lead-1' });
    expect(result).toBe('contract-id-123');
  });

  it('throws on RPC error with message preserved', async () => {
    rpcMock.mockResolvedValue({ data: null, error: { message: 'already_converted' } });
    await expect(adminConvertLeadToContract('lead-1')).rejects.toMatchObject({ message: 'already_converted' });
  });

  it('returns the contract id as string when data is present', async () => {
    rpcMock.mockResolvedValue({ data: 'ct-abc', error: null });
    const result = await adminConvertLeadToContract('lead-2');
    expect(typeof result).toBe('string');
    expect(result).toBe('ct-abc');
  });
});

describe('AdminLeadRequests.tsx regression (C1)', () => {
  const src = readFileSync(resolve(__dirname, '../../../../pages/admin/AdminLeadRequests.tsx'), 'utf8');

  it('no longer contains direct supabase.rpc for admin_convert_lead_to_contract', () => {
    expect(src).not.toMatch(/supabase\.rpc\(\s*['"]admin_convert_lead_to_contract['"]/);
  });

  it('uses adminConvertLeadToContract wrapper', () => {
    expect(src).toMatch(/adminConvertLeadToContract\(/);
  });

  it('leaves direct businesses lookup untouched for D4', () => {
    expect(src).toMatch(/\.from\(\s*['"]businesses['"]\s*\)/);
  });
});
