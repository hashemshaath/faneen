import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../updateBusinessById', () => ({
  updateBusinessById: vi.fn(async () => ({ data: null, error: null })),
}));
vi.mock('../updateBusinessesByIds', () => ({
  updateBusinessesByIds: vi.fn(async () => ({ data: null, error: null })),
}));

import { updateBusinessById } from '../updateBusinessById';
import { updateBusinessesByIds } from '../updateBusinessesByIds';
import {
  setBusinessActive,
  setBusinessVerified,
  bulkSetBusinessesActive,
  bulkSetBusinessesVerified,
} from '../guardedMutations';

beforeEach(() => {
  (updateBusinessById as unknown as ReturnType<typeof vi.fn>).mockClear();
  (updateBusinessesByIds as unknown as ReturnType<typeof vi.fn>).mockClear();
  (updateBusinessById as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({ data: null, error: null });
  (updateBusinessesByIds as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({ data: null, error: null });
});

describe('guardedMutations', () => {
  it('setBusinessActive calls updateBusinessById with { is_active }', async () => {
    await setBusinessActive('biz-1', false);
    expect(updateBusinessById).toHaveBeenCalledWith({ id: 'biz-1', values: { is_active: false } });
  });

  it('setBusinessVerified calls updateBusinessById with { is_verified }', async () => {
    await setBusinessVerified('biz-2', true);
    expect(updateBusinessById).toHaveBeenCalledWith({ id: 'biz-2', values: { is_verified: true } });
  });

  it('bulkSetBusinessesActive calls updateBusinessesByIds with { is_active }', async () => {
    await bulkSetBusinessesActive(['a', 'b'], true);
    expect(updateBusinessesByIds).toHaveBeenCalledWith({ ids: ['a', 'b'], values: { is_active: true } });
  });

  it('bulkSetBusinessesVerified calls updateBusinessesByIds with { is_verified }', async () => {
    await bulkSetBusinessesVerified(['x'], false);
    expect(updateBusinessesByIds).toHaveBeenCalledWith({ ids: ['x'], values: { is_verified: false } });
  });

  it('propagates errors from updateBusinessById', async () => {
    (updateBusinessById as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      data: null,
      error: new Error('rls denied'),
    });
    await expect(setBusinessActive('biz-1', true)).rejects.toThrow('rls denied');
  });

  it('propagates errors from updateBusinessesByIds', async () => {
    (updateBusinessesByIds as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      data: null,
      error: { message: 'bulk failed' },
    });
    await expect(bulkSetBusinessesVerified(['a'], true)).rejects.toThrow('bulk failed');
  });
});