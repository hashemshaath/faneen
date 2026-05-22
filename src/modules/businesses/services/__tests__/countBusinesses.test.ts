import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

type Builder = {
  select: ReturnType<typeof vi.fn>;
  eq: ReturnType<typeof vi.fn>;
  gte: ReturnType<typeof vi.fn>;
  lte: ReturnType<typeof vi.fn>;
  in: ReturnType<typeof vi.fn>;
  is: ReturnType<typeof vi.fn>;
  not: ReturnType<typeof vi.fn>;
  then: (resolve: (v: { data: unknown; error: unknown; count: number | null }) => unknown) => Promise<unknown>;
};

function makeBuilder(result: { data: unknown; error: unknown; count: number | null }): Builder {
  const b: Record<string, unknown> = {};
  const chain = () => b as unknown as Builder;
  b.select = vi.fn(chain);
  b.eq = vi.fn(chain);
  b.gte = vi.fn(chain);
  b.lte = vi.fn(chain);
  b.in = vi.fn(chain);
  b.is = vi.fn(chain);
  b.not = vi.fn(chain);
  b.then = (onFulfilled: (v: typeof result) => unknown) =>
    Promise.resolve(result).then(onFulfilled);
  return b as unknown as Builder;
}

let builder: Builder;
const fromMock = vi.fn((_t: string) => builder);

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: (t: string) => fromMock(t) },
}));

import { countBusinesses } from '../countBusinesses';

beforeEach(() => {
  fromMock.mockClear();
  builder = makeBuilder({ data: null, error: null, count: 7 });
});

describe('countBusinesses', () => {
  it("queries from('businesses') with select('*', { count: 'exact', head: true }) by default", async () => {
    await countBusinesses();
    expect(fromMock).toHaveBeenCalledWith('businesses');
    expect(builder.select).toHaveBeenCalledWith('*', { count: 'exact', head: true });
  });

  it('honors custom select string', async () => {
    await countBusinesses({ select: 'id' });
    expect(builder.select).toHaveBeenCalledWith('id', { count: 'exact', head: true });
  });

  it('applies eq/gte/lte/in/is filters in given order', async () => {
    await countBusinesses({
      select: 'id',
      filters: [
        { column: 'user_id', op: 'eq', value: 'u1' },
        { column: 'created_at', op: 'gte', value: '2025-01-01' },
        { column: 'created_at', op: 'lte', value: '2025-12-31' },
        { column: 'approval_status', op: 'in', value: ['submitted', 'under_review'] },
        { column: 'deleted_at', op: 'is', value: null },
      ],
    });
    expect(builder.eq).toHaveBeenCalledWith('user_id', 'u1');
    expect(builder.gte).toHaveBeenCalledWith('created_at', '2025-01-01');
    expect(builder.lte).toHaveBeenCalledWith('created_at', '2025-12-31');
    expect(builder.in).toHaveBeenCalledWith('approval_status', ['submitted', 'under_review']);
    expect(builder.is).toHaveBeenCalledWith('deleted_at', null);
  });

  it("applies not(column, operator, value) — e.g. not('latitude', 'is', null)", async () => {
    await countBusinesses({
      select: 'id',
      filters: [
        { column: 'latitude', op: 'not', operator: 'is', value: null },
        { column: 'longitude', op: 'not', operator: 'is', value: null },
      ],
    });
    expect(builder.not).toHaveBeenNthCalledWith(1, 'latitude', 'is', null);
    expect(builder.not).toHaveBeenNthCalledWith(2, 'longitude', 'is', null);
  });

  it('returns raw { data, error, count } unchanged', async () => {
    builder = makeBuilder({ data: null, error: null, count: 42 });
    const res = await countBusinesses({ select: 'id' });
    expect(res).toEqual({ data: null, error: null, count: 42 });
  });

  it('does not throw on returned { error }', async () => {
    builder = makeBuilder({ data: null, error: { message: 'rls' }, count: null });
    const res = await countBusinesses({ select: 'id' });
    expect(res.error).toEqual({ message: 'rls' });
    expect(res.count).toBeNull();
  });

  it('bubbles thrown Supabase errors', async () => {
    fromMock.mockImplementationOnce(() => {
      throw new Error('boom');
    });
    await expect(countBusinesses({ select: 'id' })).rejects.toThrow('boom');
  });
});

/** P-19 migration regression locks. */
const read = (p: string) => readFileSync(resolve(process.cwd(), p), 'utf-8');

describe('P-19 businesses count/head migration', () => {
  it('ProviderMembershipCard uses countBusinesses with user_id eq filter; no direct businesses count/head read', () => {
    const src = read('src/components/dashboard/ProviderMembershipCard.tsx');
    expect(src).toMatch(/countBusinesses\(/);
    expect(src).toContain("['provider-business-count', userId]");
    expect(src).toContain("filters: [{ column: 'user_id', op: 'eq', value: userId }]");
    expect(src).toContain('return count ?? 0;');
    expect(src).not.toMatch(
      /from\(['"]businesses['"]\)[\s\S]{0,200}count:\s*'exact',\s*head:\s*true/,
    );
  });

  it('AdminDashboardView migrates the 3 businesses count/head reads (total, today, pending approval)', () => {
    const src = read('src/pages/dashboard/overview/AdminDashboardView.tsx');
    expect(src).toMatch(/countBusinesses\(\{ select: 'id' \}\)/);
    expect(src).toContain(
      "countBusinesses({ select: 'id', filters: [{ column: 'created_at', op: 'gte', value: todayIso }] })",
    );
    expect(src).toContain(
      "countBusinesses({ select: 'id', filters: [{ column: 'approval_status', op: 'in', value: ['submitted', 'under_review'] }] })",
    );
    expect(src).not.toMatch(
      /supabase\.from\(['"]businesses['"]\)[\s\S]{0,200}count:\s*'exact',\s*head:\s*true/,
    );
    expect(src).toContain("queryKey: ['admin-overview-stats']");
  });

  it('AdminLocationsHub migrates total + with-coordinates counts via countBusinesses', () => {
    const src = read('src/pages/admin/locations/AdminLocationsHub.tsx');
    expect(src).toMatch(/countBusinesses\(/);
    expect(src).toContain("{ column: 'latitude', op: 'not', operator: 'is', value: null }");
    expect(src).toContain("{ column: 'longitude', op: 'not', operator: 'is', value: null }");
    expect(src).toContain("countBusinesses({ select: 'id' })");
    expect(src).not.toMatch(
      /supabase\.from\(['"]businesses['"]\)[\s\S]{0,200}count:\s*'exact',\s*head:\s*true/,
    );
    expect(src).toContain("queryKey: ['admin-locations-hub-stats']");
  });
});

describe('P-19 intentionally-deferred businesses reads', () => {
  it('ensure-business safety-net reads remain direct', () => {
    const src = read('src/lib/ensure-business.ts');
    expect(src).toMatch(/\.from\(['"]businesses['"]\)/);
  });

  it('admin full-list reads remain direct (AdminBusinesses)', () => {
    const src = read('src/pages/admin/AdminBusinesses.tsx');
    expect(src).toMatch(/supabase\.from\(['"]businesses['"]\)\.select\(['"]\*['"]\)/);
  });

  it('countActiveBusinesses wrapper remains intact and is not removed', () => {
    const src = read('src/modules/businesses/services/countActiveBusinesses.ts');
    expect(src).toMatch(/countActiveBusinesses/);
    expect(src).toMatch(/eq\(['"]is_active['"], true\)/);
  });
});