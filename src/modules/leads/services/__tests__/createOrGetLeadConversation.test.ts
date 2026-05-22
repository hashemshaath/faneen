import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const rpcMock = vi.fn();

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    rpc: (...args: unknown[]) => rpcMock(...args),
  },
}));

import { createOrGetLeadConversation } from '../createOrGetLeadConversation';

beforeEach(() => {
  rpcMock.mockReset();
});

describe('createOrGetLeadConversation (E3)', () => {
  it('calls exact RPC name create_or_get_lead_conversation', async () => {
    rpcMock.mockResolvedValue({ data: 'conv-123', error: null });
    await createOrGetLeadConversation({ _lead_id: 'lead-1' });
    expect(rpcMock).toHaveBeenCalledTimes(1);
    expect(rpcMock).toHaveBeenCalledWith('create_or_get_lead_conversation', { _lead_id: 'lead-1' });
  });

  it('passes exact params object with _lead_id field', async () => {
    rpcMock.mockResolvedValue({ data: null, error: null });
    await createOrGetLeadConversation({ _lead_id: 'abc' });
    expect(rpcMock).toHaveBeenCalledWith('create_or_get_lead_conversation', { _lead_id: 'abc' });
  });

  it('returns raw { data, error } shape from supabase.rpc', async () => {
    rpcMock.mockResolvedValue({ data: 'conv-456', error: null });
    const result = await createOrGetLeadConversation({ _lead_id: 'lead-2' });
    expect(result).toHaveProperty('data', 'conv-456');
    expect(result).toHaveProperty('error', null);
  });

  it('bubbles RPC errors exactly as supabase does', async () => {
    rpcMock.mockResolvedValue({ data: null, error: { message: 'rpc failed' } });
    const result = await createOrGetLeadConversation({ _lead_id: 'lead-3' });
    expect(result.error).toEqual({ message: 'rpc failed' });
  });

  it('bubbles thrown errors exactly as supabase does', async () => {
    rpcMock.mockRejectedValue(new Error('network'));
    await expect(createOrGetLeadConversation({ _lead_id: 'lead-4' })).rejects.toThrow('network');
  });
});

describe('DashboardLeads.tsx regression (E3)', () => {
  const src = readFileSync(
    resolve(__dirname, '../../../../pages/dashboard/DashboardLeads.tsx'),
    'utf8',
  );

  it('no longer contains direct supabase.rpc for create_or_get_lead_conversation', () => {
    expect(src).not.toMatch(/supabase\.rpc\(\s*['"]create_or_get_lead_conversation['"]/);
  });

  it('uses createOrGetLeadConversation wrapper', () => {
    expect(src).toMatch(/createOrGetLeadConversation\(/);
  });

  it('preserves fail-soft try/catch wrapping in updateStatus', () => {
    // After replacement, the fire-and-forget block should still be wrapped in try/catch
    expect(src).toMatch(/try \{\s*await createOrGetLeadConversation\([^)]*\)[\s\S]*?\} catch \{ \/\* fail-soft \*\/ \}/);
  });

  it('preserves ensureConversation blocking error behavior (onError toast)', () => {
    expect(src).toMatch(/onError:\s*\(err:/);
    expect(src).toMatch(/Could not open conversation/);
  });

  it('preserves sendQuote fail-soft try/catch wrapping', () => {
    expect(src).toMatch(/try \{\s*await createOrGetLeadConversation\([^)]*\)[\s\S]*?\} catch \{ \/\* fail-soft \*\/ \}/);
  });

  it('notifyCustomerLeadUpdate remains used (E1/E2 preserved)', () => {
    expect(src).toMatch(/notifyCustomerLeadUpdate\(/);
  });

  it('businesses/business_staff lookups removed (D4 complete)', () => {
    expect(src).not.toMatch(/supabase\.from\(\s*['"]businesses['"]\s*\)/);
    expect(src).not.toMatch(/supabase\.from\(\s*['"]business_staff['"]\s*\)/);
  });
});
