import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../updateBusinessStaffById', () => ({
  updateBusinessStaffById: vi.fn(async () => ({ data: null, error: null })),
}));
vi.mock('../deleteBusinessStaffById', () => ({
  deleteBusinessStaffById: vi.fn(async () => ({ data: null, error: null })),
}));

import { updateBusinessStaffById } from '../updateBusinessStaffById';
import { deleteBusinessStaffById } from '../deleteBusinessStaffById';
import {
  updateBusinessStaffRole,
  setBusinessStaffActive,
  removeBusinessStaff,
} from '../guardedStaffMutations';

beforeEach(() => {
  (updateBusinessStaffById as unknown as ReturnType<typeof vi.fn>).mockClear();
  (deleteBusinessStaffById as unknown as ReturnType<typeof vi.fn>).mockClear();
  (updateBusinessStaffById as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({ data: null, error: null });
  (deleteBusinessStaffById as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({ data: null, error: null });
});

describe('guardedStaffMutations', () => {
  it('updateBusinessStaffRole calls updateBusinessStaffById with { role }', async () => {
    await updateBusinessStaffRole('s-1', 'manager');
    expect(updateBusinessStaffById).toHaveBeenCalledWith({ id: 's-1', values: { role: 'manager' } });
  });

  it('setBusinessStaffActive calls updateBusinessStaffById with { is_active }', async () => {
    await setBusinessStaffActive('s-2', false);
    expect(updateBusinessStaffById).toHaveBeenCalledWith({ id: 's-2', values: { is_active: false } });
  });

  it('removeBusinessStaff calls deleteBusinessStaffById', async () => {
    await removeBusinessStaff('s-3');
    expect(deleteBusinessStaffById).toHaveBeenCalledWith({ id: 's-3' });
  });

  it('propagates errors from updateBusinessStaffById', async () => {
    (updateBusinessStaffById as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      data: null, error: new Error('sole owner'),
    });
    await expect(updateBusinessStaffRole('s-1', 'viewer')).rejects.toThrow('sole owner');
  });

  it('propagates errors from deleteBusinessStaffById', async () => {
    (deleteBusinessStaffById as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      data: null, error: { message: 'cannot remove sole owner' },
    });
    await expect(removeBusinessStaff('s-3')).rejects.toThrow('cannot remove sole owner');
  });
});