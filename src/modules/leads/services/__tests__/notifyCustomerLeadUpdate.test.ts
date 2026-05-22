import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const invokeMock = vi.fn();

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    functions: { invoke: (...args: unknown[]) => invokeMock(...args) },
  },
}));

import { notifyCustomerLeadUpdate } from '../notifyCustomerLeadUpdate';

beforeEach(() => {
  invokeMock.mockReset();
});

describe('notifyCustomerLeadUpdate (E1/E2)', () => {
  it('calls notify-customer-lead-update edge function with exact body', async () => {
    invokeMock.mockResolvedValue({ data: { ok: true }, error: null });
    const payload = { lead_id: 'lead-1', status: 'accepted' };
    const result = await notifyCustomerLeadUpdate(payload);
    expect(invokeMock).toHaveBeenCalledTimes(1);
    expect(invokeMock).toHaveBeenCalledWith('notify-customer-lead-update', { body: payload });
    expect(result).toEqual({ data: { ok: true }, error: null });
  });

  it('forwards arbitrary status values', async () => {
    invokeMock.mockResolvedValue({ data: null, error: null });
    await notifyCustomerLeadUpdate({ lead_id: 'l', status: 'cancelled' });
    expect(invokeMock).toHaveBeenCalledWith('notify-customer-lead-update', {
      body: { lead_id: 'l', status: 'cancelled' },
    });
  });

  it('returns the raw invoke result shape', async () => {
    invokeMock.mockResolvedValue({ data: { x: 1 }, error: null });
    const r = await notifyCustomerLeadUpdate({ lead_id: 'l', status: 'quoted' });
    expect(r).toHaveProperty('data');
    expect(r).toHaveProperty('error');
  });

  it('bubbles invoke errors exactly as supabase does', async () => {
    invokeMock.mockRejectedValue(new Error('boom'));
    await expect(notifyCustomerLeadUpdate({ lead_id: 'l', status: 'quoted' })).rejects.toThrow('boom');
  });
});

describe('DashboardLeads.tsx regression (E1)', () => {
  const src = readFileSync(
    resolve(__dirname, '../../../../pages/dashboard/DashboardLeads.tsx'),
    'utf8',
  );

  it('no longer contains direct supabase.functions.invoke for notify-customer-lead-update', () => {
    expect(src).not.toMatch(/supabase\.functions\.invoke\(\s*['"]notify-customer-lead-update['"]/);
  });

  it('uses notifyCustomerLeadUpdate wrapper', () => {
    expect(src).toMatch(/notifyCustomerLeadUpdate\(/);
  });

  it('preserves fire-and-forget try/catch fail-soft wrapping', () => {
    expect(src).toMatch(/try \{\s*await notifyCustomerLeadUpdate\([^)]*\);\s*\} catch \{ \/\* fail-soft \*\/ \}/);
  });

  it('leaves businesses lookup untouched (deferred D4)', () => {
    expect(src).toMatch(/supabase\.from\(\s*['"]businesses['"]\s*\)/);
  });

  it('leaves business_staff lookup untouched (deferred D4)', () => {
    expect(src).toMatch(/supabase\.from\(\s*['"]business_staff['"]\s*\)/);
  });

  it('leaves create_or_get_lead_conversation RPC untouched (deferred E3)', () => {
    expect(src).toMatch(/supabase\.rpc\(\s*['"]create_or_get_lead_conversation['"]/);
  });
});

describe('DashboardMyRequests.tsx regression (E2)', () => {
  const src = readFileSync(
    resolve(__dirname, '../../../../pages/dashboard/DashboardMyRequests.tsx'),
    'utf8',
  );

  it('no longer contains direct supabase.functions.invoke for notify-customer-lead-update', () => {
    expect(src).not.toMatch(/supabase\.functions\.invoke\(\s*['"]notify-customer-lead-update['"]/);
  });

  it('uses notifyCustomerLeadUpdate wrapper', () => {
    expect(src).toMatch(/notifyCustomerLeadUpdate\(/);
  });

  it('preserves cancelled status payload', () => {
    expect(src).toMatch(/notifyCustomerLeadUpdate\(\s*\{\s*lead_id:\s*id,\s*status:\s*['"]cancelled['"]\s*\}\s*\)/);
  });

  it('preserves fire-and-forget try/catch fail-soft wrapping', () => {
    expect(src).toMatch(/try \{\s*await notifyCustomerLeadUpdate\([^)]*\);\s*\} catch \{ \/\* fail-soft \*\/ \}/);
  });

  it('still imports supabase for deferred direct usages', () => {
    expect(src).toMatch(/from '@\/integrations\/supabase\/client'/);
  });
});