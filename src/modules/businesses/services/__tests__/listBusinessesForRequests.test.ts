import { describe, it, expect, vi, beforeEach } from 'vitest';

const inMock = vi.fn();
const selectMock = vi.fn(() => ({ in: inMock }));
const fromMock = vi.fn(() => ({ select: selectMock }));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: (t: string) => fromMock(t) },
}));

import { listBusinessesForRequests } from '../listBusinessesForRequests';

beforeEach(() => {
  fromMock.mockClear();
  selectMock.mockClear();
  inMock.mockReset();
});

describe('listBusinessesForRequests (P-24)', () => {
  it('queries the "businesses" table', async () => {
    inMock.mockResolvedValue({ data: [], error: null });
    await listBusinessesForRequests(['b1']);
    expect(fromMock).toHaveBeenCalledWith('businesses');
  });

  it('uses exact select string with username', async () => {
    inMock.mockResolvedValue({ data: [], error: null });
    await listBusinessesForRequests(['b1']);
    expect(selectMock).toHaveBeenCalledWith('id, name_ar, name_en, username');
  });

  it('applies .in("id", ids) filter exactly', async () => {
    inMock.mockResolvedValue({ data: [], error: null });
    await listBusinessesForRequests(['b1', 'b2']);
    expect(inMock).toHaveBeenCalledWith('id', ['b1', 'b2']);
  });

  it('returns rows preserving shape', async () => {
    const rows = [{ id: 'b1', name_ar: 'أ', name_en: 'A', username: 'acme' }];
    inMock.mockResolvedValue({ data: rows, error: null });
    expect(await listBusinessesForRequests(['b1'])).toEqual(rows);
  });

  it('returns [] when data is null', async () => {
    inMock.mockResolvedValue({ data: null, error: null });
    expect(await listBusinessesForRequests(['b1'])).toEqual([]);
  });

  it('throws when supabase returns an error', async () => {
    inMock.mockResolvedValue({ data: null, error: new Error('boom') });
    await expect(listBusinessesForRequests(['b1'])).rejects.toThrow('boom');
  });
});