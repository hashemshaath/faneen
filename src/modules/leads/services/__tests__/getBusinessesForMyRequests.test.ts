import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const inMock = vi.fn();
const selectMock = vi.fn(() => ({ in: inMock }));
const fromMock = vi.fn((_table: string) => ({ select: selectMock }));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: (t: string) => fromMock(t) },
}));

import { getBusinessesForMyRequests } from '../getBusinessesForMyRequests';

beforeEach(() => {
  fromMock.mockClear();
  selectMock.mockClear();
  inMock.mockReset();
});

describe('getBusinessesForMyRequests (D4)', () => {
  it('queries the exact "businesses" table', async () => {
    inMock.mockResolvedValue({ data: [], error: null });
    await getBusinessesForMyRequests(['b1']);
    expect(fromMock).toHaveBeenCalledWith('businesses');
  });

  it('uses exact select string with username included', async () => {
    inMock.mockResolvedValue({ data: [], error: null });
    await getBusinessesForMyRequests(['b1']);
    expect(selectMock).toHaveBeenCalledWith('id, name_ar, name_en, username');
  });

  it('applies .in("id", businessIds) filter exactly', async () => {
    inMock.mockResolvedValue({ data: [], error: null });
    await getBusinessesForMyRequests(['b1', 'b2']);
    expect(inMock).toHaveBeenCalledWith('id', ['b1', 'b2']);
  });

  it('returns data array preserving shape', async () => {
    const rows = [{ id: 'b1', name_ar: 'أ', name_en: 'A', username: 'acme' }];
    inMock.mockResolvedValue({ data: rows, error: null });
    const result = await getBusinessesForMyRequests(['b1']);
    expect(result).toEqual(rows);
  });

  it('returns [] when data is null', async () => {
    inMock.mockResolvedValue({ data: null, error: null });
    const result = await getBusinessesForMyRequests(['b1']);
    expect(result).toEqual([]);
  });

  it('throws when supabase returns an error', async () => {
    inMock.mockResolvedValue({ data: null, error: new Error('boom') });
    await expect(getBusinessesForMyRequests(['b1'])).rejects.toThrow('boom');
  });
});

describe('DashboardMyRequests.tsx regression (D4)', () => {
  const src = readFileSync(
    resolve(__dirname, '../../../../pages/dashboard/DashboardMyRequests.tsx'),
    'utf8',
  );

  it('no longer contains direct supabase.from for businesses lookup', () => {
    expect(src).not.toMatch(/supabase\.from\(/);
  });

  it('uses getBusinessesForMyRequests service', () => {
    expect(src).toMatch(/getBusinessesForMyRequests\(/);
  });

  it('no longer imports supabase client directly', () => {
    expect(src).not.toMatch(/from '@\/integrations\/supabase\/client'/);
  });

  it('preserves React Query key for my-requests-businesses', () => {
    expect(src).toMatch(/['"]my-requests-businesses['"]/);
  });

  it('still uses notifyCustomerLeadUpdate (E1/E2 preserved)', () => {
    expect(src).toMatch(/notifyCustomerLeadUpdate\(/);
  });
});