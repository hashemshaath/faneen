import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

type Builder = {
  insert: ReturnType<typeof vi.fn>;
  select: ReturnType<typeof vi.fn>;
  single: ReturnType<typeof vi.fn>;
  maybeSingle: ReturnType<typeof vi.fn>;
  then: (fn: (v: unknown) => unknown) => Promise<unknown>;
};

function makeBuilder(result: { data: unknown; error: unknown }): Builder {
  const b: Record<string, unknown> = {};
  const chain = () => b as unknown as Builder;
  b.insert = vi.fn(chain);
  b.select = vi.fn(chain);
  b.single = vi.fn(() => Promise.resolve(result));
  b.maybeSingle = vi.fn(() => Promise.resolve(result));
  b.then = (onFulfilled: (v: unknown) => unknown) =>
    Promise.resolve(result).then(onFulfilled);
  return b as unknown as Builder;
}

let builder: Builder;
const fromMock = vi.fn((_t: string) => builder);

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: (t: string) => fromMock(t) },
}));

import { insertBusiness } from '../insertBusiness';

beforeEach(() => {
  fromMock.mockClear();
  builder = makeBuilder({ data: null, error: null });
});

describe('insertBusiness service', () => {
  it("calls from('businesses').insert(payload)", async () => {
    const payload = { user_id: 'u1', name_ar: 'A', username: 'x', approval_status: 'draft' };
    await insertBusiness({ payload });
    expect(fromMock).toHaveBeenCalledWith('businesses');
    expect(builder.insert).toHaveBeenCalledWith(payload);
  });

  it('preserves payload identity (no clone, no transform)', async () => {
    const payload = { user_id: 'u1', name_ar: '  A  ', username: 'x', sectors: [] as string[] };
    await insertBusiness({ payload });
    expect((builder.insert.mock.calls[0]?.[0] as unknown)).toBe(payload);
  });

  it("terminal 'none' (default) does not call select/single/maybeSingle", async () => {
    await insertBusiness({ payload: { user_id: 'u1' } });
    expect(builder.select).not.toHaveBeenCalled();
    expect(builder.single).not.toHaveBeenCalled();
    expect(builder.maybeSingle).not.toHaveBeenCalled();
  });

  it("explicit terminal 'none' does not call select/single/maybeSingle", async () => {
    await insertBusiness({ payload: { user_id: 'u1' }, terminal: 'none' });
    expect(builder.select).not.toHaveBeenCalled();
    expect(builder.single).not.toHaveBeenCalled();
    expect(builder.maybeSingle).not.toHaveBeenCalled();
  });

  it("terminal 'maybeSingle' with select calls select(select).maybeSingle()", async () => {
    const SEL = 'id, name_ar, ref_id';
    await insertBusiness({ payload: { user_id: 'u1' }, select: SEL, terminal: 'maybeSingle' });
    expect(builder.select).toHaveBeenCalledWith(SEL);
    expect(builder.maybeSingle).toHaveBeenCalledTimes(1);
    expect(builder.single).not.toHaveBeenCalled();
  });

  it("terminal 'single' with select calls select(select).single()", async () => {
    const SEL = 'id, name_ar';
    await insertBusiness({ payload: { user_id: 'u1' }, select: SEL, terminal: 'single' });
    expect(builder.select).toHaveBeenCalledWith(SEL);
    expect(builder.single).toHaveBeenCalledTimes(1);
    expect(builder.maybeSingle).not.toHaveBeenCalled();
  });

  it("when select missing but terminal set, falls back to 'none' (no select/single)", async () => {
    await insertBusiness({ payload: { user_id: 'u1' }, terminal: 'maybeSingle' });
    expect(builder.select).not.toHaveBeenCalled();
    expect(builder.maybeSingle).not.toHaveBeenCalled();
  });

  it('returns raw { data, error } unchanged (terminal none)', async () => {
    builder = makeBuilder({ data: null, error: { message: 'rls' } });
    const r = await insertBusiness({ payload: { user_id: 'u1' } });
    expect(r).toEqual({ data: null, error: { message: 'rls' } });
  });

  it('returned { error } does NOT throw automatically', async () => {
    builder = makeBuilder({ data: null, error: { message: 'duplicate key value' } });
    const r = await insertBusiness({ payload: { user_id: 'u1' } });
    expect((r.error as { message: string }).message).toMatch(/duplicate/);
  });

  it('returns raw row on maybeSingle path', async () => {
    builder = makeBuilder({ data: { id: 'b1' }, error: null });
    const r = await insertBusiness({
      payload: { user_id: 'u1' },
      select: 'id',
      terminal: 'maybeSingle',
    });
    expect(r).toEqual({ data: { id: 'b1' }, error: null });
  });

  it('bubbles thrown Supabase errors', async () => {
    builder = {
      insert: vi.fn(() => { throw new Error('boom'); }),
      select: vi.fn(),
      single: vi.fn(),
      maybeSingle: vi.fn(),
      then: () => Promise.resolve({ data: null, error: null }),
    } as unknown as Builder;
    await expect(insertBusiness({ payload: { user_id: 'u1' } })).rejects.toThrow('boom');
  });
});

describe('migration regression: authService createBusiness', () => {
  const src = readFileSync(resolve(__dirname, '../../../../services/auth/authService.ts'), 'utf8');

  it('no longer directly inserts businesses via supabase.from', () => {
    expect(src).not.toMatch(/supabase\s*\.\s*from\(['"]businesses['"]\)\s*\.\s*insert/);
  });
  it('imports insertBusiness from @/modules/businesses', () => {
    expect(src).toMatch(/insertBusiness/);
    expect(src).toMatch(/from '@\/modules\/businesses'/);
  });
  it('preserves all payload fields exactly', () => {
    expect(src).toMatch(/user_id:\s*userId/);
    expect(src).toMatch(/name_ar:\s*sanitizedName/);
    expect(src).toMatch(/username:\s*sanitizedUsername/);
    expect(src).toMatch(/sectors:\s*extras\?\.sectors\s*\?\?\s*\[\]/);
    expect(src).toMatch(/sub_services:\s*extras\?\.sub_services\s*\?\?\s*\[\]/);
    expect(src).toMatch(/description_ar:\s*extras\?\.description_ar\s*\?/);
    expect(src).toMatch(/approval_status:\s*'draft'/);
    expect(src).toMatch(/username_status:\s*'pending'/);
  });
  it("uses terminal 'none'", () => {
    expect(src).toMatch(/terminal:\s*'none'/);
  });
  it('preserves duplicate-tolerant branch (only non-duplicate errors throw)', () => {
    expect(src).toMatch(/duplicate/);
    expect(src).toMatch(/throw\s+error/);
  });
  it('preserves welcome-business email fire on no error', () => {
    expect(src).toMatch(/welcome-business/);
    expect(src).toMatch(/if\s*\(\s*!error\s*&&\s*extras\?\.recipientEmail\s*\)/);
  });
});

describe('migration regression: ensureDraftBusiness', () => {
  const src = readFileSync(resolve(__dirname, '../../../../lib/ensure-business.ts'), 'utf8');

  it('no longer directly inserts businesses via supabase.from', () => {
    expect(src).not.toMatch(/supabase\s*\.\s*from\(['"]businesses['"]\)\s*[\s\S]{0,40}\.insert/);
  });
  it('imports insertBusiness from @/modules/businesses', () => {
    expect(src).toMatch(/insertBusiness/);
    expect(src).toMatch(/from '@\/modules\/businesses'/);
  });
  it('preserves SELECT_COLS usage', () => {
    expect(src).toMatch(/const\s+SELECT_COLS\s*=/);
    expect(src).toMatch(/select:\s*SELECT_COLS/);
  });
  it("uses terminal 'maybeSingle'", () => {
    expect(src).toMatch(/terminal:\s*'maybeSingle'/);
  });
  it('preserves placeholder payload fields', () => {
    expect(src).toMatch(/user_id:\s*userId/);
    expect(src).toMatch(/name_ar:\s*placeholderName/);
    expect(src).toMatch(/username:\s*placeholderUsername/);
    expect(src).toMatch(/approval_status:\s*'draft'/);
    expect(src).toMatch(/username_status:\s*'pending'/);
  });
  it('preserves race recovery re-query on error via getOwnerBusiness', () => {
    expect(src).toMatch(/if\s*\(\s*error\s*\)\s*\{[\s\S]*?getOwnerBusiness[\s\S]*?select:\s*SELECT_COLS/);
    expect(src).toMatch(/raced/);
  });
});