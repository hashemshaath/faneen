import { describe, it, expect, vi, beforeEach } from 'vitest';

const rpcMock = vi.fn();

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    rpc: (...args: unknown[]) => rpcMock(...args),
  },
}));

import {
  getContractAnalyticsDashboard,
  getAdminContractAnalyticsDashboard,
} from '../analytics';

beforeEach(() => {
  rpcMock.mockReset();
});

describe('CT-11 contract analytics RPC wrappers', () => {
  it('getContractAnalyticsDashboard forwards exact RPC + raw shape', async () => {
    rpcMock.mockResolvedValueOnce({ data: { kpis: {} }, error: null });
    const args = { _business_id: 'b1', _period: '30d', _scope: 'provider' };
    const r = await getContractAnalyticsDashboard(args);
    expect(rpcMock).toHaveBeenCalledWith('get_contract_analytics_dashboard', args);
    expect(r).toEqual({ data: { kpis: {} }, error: null });
  });

  it('getContractAnalyticsDashboard supports undefined _business_id', async () => {
    rpcMock.mockResolvedValueOnce({ data: null, error: null });
    const args = { _business_id: undefined, _period: '7d', _scope: 'provider' };
    await getContractAnalyticsDashboard(args);
    expect(rpcMock).toHaveBeenCalledWith('get_contract_analytics_dashboard', args);
  });

  it('getAdminContractAnalyticsDashboard forwards exact RPC + raw shape', async () => {
    rpcMock.mockResolvedValueOnce({ data: { totals: {} }, error: null });
    const args = { _period: '90d', _business_id: undefined, _include_demo: true };
    const r = await getAdminContractAnalyticsDashboard(args);
    expect(rpcMock).toHaveBeenCalledWith('get_admin_contract_analytics_dashboard', args);
    expect(r).toEqual({ data: { totals: {} }, error: null });
  });

  it('getAdminContractAnalyticsDashboard surfaces RPC errors raw (no throw)', async () => {
    rpcMock.mockResolvedValueOnce({ data: null, error: { code: '42501', message: 'FORBIDDEN' } });
    const r = await getAdminContractAnalyticsDashboard({
      _period: '30d', _business_id: undefined, _include_demo: false,
    });
    expect(r.error).toEqual({ code: '42501', message: 'FORBIDDEN' });
    expect(r.data).toBeNull();
  });
});