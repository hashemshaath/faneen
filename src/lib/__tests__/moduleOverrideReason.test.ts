/**
 * M6.2 — reason is mandatory when writing a module override.
 * We verify:
 *   1. `setModuleOverride` throws before hitting the RPC when the reason
 *      is missing or blank.
 *   2. `updateBusinessSystemAccess` refuses to enable an override
 *      without a non-empty reason (accountability requirement).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    rpc: vi.fn(async () => ({ data: null, error: null })),
  },
}));

import { supabase } from '@/integrations/supabase/client';
import { setModuleOverride } from '@/modules/systemAccess';
import { updateBusinessSystemAccess } from '@/modules/systemAccess/services/updateBusinessSystemAccess';

describe('M6.2 module override reason enforcement', () => {
  beforeEach(() => {
    (supabase.rpc as any).mockClear();
  });

  it('setModuleOverride throws when reason is empty', async () => {
    await expect(
      setModuleOverride({
        moduleKey: 'analytics',
        scopeType: 'entity',
        scopeValue: 'biz-1',
        enabled: true,
        reason: '   ',
      }),
    ).rejects.toThrow(/reason required/i);
    expect((supabase.rpc as any)).not.toHaveBeenCalled();
  });

  it('setModuleOverride passes the reason through when provided', async () => {
    await setModuleOverride({
      moduleKey: 'analytics',
      scopeType: 'entity',
      scopeValue: 'biz-1',
      enabled: true,
      reason: 'granted for support ticket #123',
    });
    const call = (supabase.rpc as any).mock.calls[0];
    expect(call[0]).toBe('admin_set_module_override');
    expect(call[1]._reason).toBe('granted for support ticket #123');
  });

  it('updateBusinessSystemAccess refuses to enable without reason', async () => {
    const res = await updateBusinessSystemAccess({
      moduleKey: 'analytics',
      scopeType: 'entity',
      scopeValue: 'biz-1',
      enabled: true,
      isAdmin: true,
      reason: '',
    });
    expect(res.ok).toBe(false);
    expect(res.reason_en).toMatch(/reason/i);
  });
});