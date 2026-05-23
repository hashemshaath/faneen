import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

type Builder = {
  update: ReturnType<typeof vi.fn>;
  in: ReturnType<typeof vi.fn>;
  select: ReturnType<typeof vi.fn>;
  single: ReturnType<typeof vi.fn>;
  then: (fn: (v: unknown) => unknown) => Promise<unknown>;
};

function makeBuilder(result: { data: unknown; error: unknown }): Builder {
  const b: Record<string, unknown> = {};
  const chain = () => b as unknown as Builder;
  b.update = vi.fn(chain);
  b.in = vi.fn(chain);
  b.select = vi.fn(chain);
  b.single = vi.fn(chain);
  b.then = (onFulfilled: (v: unknown) => unknown) =>
    Promise.resolve(result).then(onFulfilled);
  return b as unknown as Builder;
}

let builder: Builder;
const fromMock = vi.fn((_t: string) => builder);

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: (t: string) => fromMock(t) },
}));

import { updateBusinessesByIds } from '../updateBusinessesByIds';

beforeEach(() => {
  fromMock.mockClear();
  builder = makeBuilder({ data: null, error: null });
});

describe('updateBusinessesByIds', () => {
  it("calls from('businesses').update(values).in('id', ids)", async () => {
    const values = { is_active: false };
    const ids = ['a', 'b', 'c'];
    await updateBusinessesByIds({ ids, values });
    expect(fromMock).toHaveBeenCalledWith('businesses');
    expect(builder.update).toHaveBeenCalledWith(values);
    expect(builder.in).toHaveBeenCalledWith('id', ids);
  });

  it('passes exact values reference (no transform)', async () => {
    const values = { is_verified: true, sectors: [] as string[] };
    await updateBusinessesByIds({ ids: ['x'], values });
    expect((builder.update.mock.calls[0]?.[0] as unknown)).toBe(values);
  });

  it('does not call .select() or .single()', async () => {
    await updateBusinessesByIds({ ids: ['a'], values: { is_verified: true } });
    expect(builder.select).not.toHaveBeenCalled();
    expect(builder.single).not.toHaveBeenCalled();
  });

  it('returns raw { data, error } unchanged', async () => {
    builder = makeBuilder({ data: null, error: { message: 'rls' } });
    const r = await updateBusinessesByIds({ ids: ['a'], values: { is_active: true } });
    expect(r).toEqual({ data: null, error: { message: 'rls' } });
  });

  it('bubbles thrown Supabase errors', async () => {
    builder = {
      update: vi.fn(() => builder),
      in: vi.fn(() => { throw new Error('boom'); }),
      select: vi.fn(() => builder),
      single: vi.fn(() => builder),
      then: () => Promise.resolve({ data: null, error: null }),
    } as unknown as Builder;
    await expect(updateBusinessesByIds({ ids: ['a'], values: { is_active: true } })).rejects.toThrow('boom');
  });
});

describe('migration regression: AdminBusinesses', () => {
  const src = readFileSync(resolve(__dirname, '../../../../pages/admin/AdminBusinesses.tsx'), 'utf8');
  it('no longer directly updates businesses via supabase.from', () => {
    expect(src).not.toMatch(/supabase\.from\(['"]businesses['"]\)\s*\.update/);
  });
  it('imports updateBusinessById and updateBusinessesByIds from @/modules/businesses', () => {
    expect(src).toMatch(/updateBusinessById/);
    expect(src).toMatch(/updateBusinessesByIds/);
    expect(src).toMatch(/from '@\/modules\/businesses'/);
  });
  it('preserves toggle payload pattern { [field]: value }', () => {
    expect(src).toMatch(/updateBusinessById\(\{\s*id,\s*values:\s*\{\s*\[field\]:\s*value\s*\}\s*\}\)/);
  });
  it('preserves full admin edit using payload variable', () => {
    expect(src).toMatch(/updateBusinessById\(\{\s*id,\s*values:\s*payload\s*\}\)/);
  });
  it('preserves bulk patch using ids/patch', () => {
    expect(src).toMatch(/updateBusinessesByIds\(\{\s*ids,\s*values:\s*patch\s*\}\)/);
  });
  // R4E-2C-4-PHASE-3: tier changes go through membership-owned RPC.
  it('does NOT pass membership_tier in updateBusinessById values', () => {
    expect(src).not.toMatch(/updateBusinessById\([^)]*membership_tier/);
  });
  it('does NOT pass membership_tier in updateBusinessesByIds values/patch', () => {
    expect(src).not.toMatch(/updateBusinessesByIds\([^)]*membership_tier/);
  });
  it('routes tier changes through setBusinessMembershipTier', () => {
    expect(src).toMatch(/setBusinessMembershipTier\(/);
  });
  it('admin_activity_log writes remain present', () => {
    expect(src).toMatch(/admin_activity_log/);
    expect(src).toMatch(/business_updated/);
  });
});

describe('migration regression: AdminBusinessCoordinates', () => {
  const src = readFileSync(resolve(__dirname, '../../../../pages/admin/locations/AdminBusinessCoordinates.tsx'), 'utf8');
  it('no longer directly updates businesses via supabase.from', () => {
    expect(src).not.toMatch(/supabase\.from\(['"]businesses['"]\)\s*[\s\S]{0,200}\.update/);
  });
  it('imports updateBusinessById from @/modules/businesses', () => {
    expect(src).toMatch(/updateBusinessById/);
    expect(src).toMatch(/from '@\/modules\/businesses'/);
  });
  it('preserves coordinates payload fields', () => {
    expect(src).toMatch(/latitude:\s*editor\.latitude/);
    expect(src).toMatch(/longitude:\s*editor\.longitude/);
    expect(src).toMatch(/region:\s*editor\.region/);
    expect(src).toMatch(/district:\s*editor\.district/);
    expect(src).toMatch(/address:\s*editor\.address/);
  });
  it('preserves editor.id as update id', () => {
    expect(src).toMatch(/id:\s*editor\.id/);
  });
});

describe('migration regression: CrDocumentScanner', () => {
  const src = readFileSync(resolve(__dirname, '../../../../components/admin/CrDocumentScanner.tsx'), 'utf8');
  it('no longer directly updates businesses via supabase.from', () => {
    expect(src).not.toMatch(/supabase\.from\(['"]businesses['"]\)\s*\.update/);
  });
  it('imports updateBusinessById from @/modules/businesses', () => {
    expect(src).toMatch(/updateBusinessById/);
    expect(src).toMatch(/from '@\/modules\/businesses'/);
  });
});

