import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

type Builder = {
  update: ReturnType<typeof vi.fn>;
  eq: ReturnType<typeof vi.fn>;
  select: ReturnType<typeof vi.fn>;
  single: ReturnType<typeof vi.fn>;
  then: (fn: (v: unknown) => unknown) => Promise<unknown>;
};

function makeBuilder(result: { data: unknown; error: unknown }): Builder {
  const b: Record<string, unknown> = {};
  const chain = () => b as unknown as Builder;
  b.update = vi.fn(chain);
  b.eq = vi.fn(chain);
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

import { updateBusinessById } from '../updateBusinessById';

beforeEach(() => {
  fromMock.mockClear();
  builder = makeBuilder({ data: null, error: null });
});

describe('updateBusinessById', () => {
  it("calls from('businesses').update(values).eq('id', id)", async () => {
    const values = { name_ar: 'A', phone: '+9665', sectors: ['aluminum'] };
    await updateBusinessById({ id: 'b1', values });
    expect(fromMock).toHaveBeenCalledWith('businesses');
    expect(builder.update).toHaveBeenCalledWith(values);
    expect(builder.eq).toHaveBeenCalledWith('id', 'b1');
  });

  it('does not transform payload (passes the exact object reference)', async () => {
    const values = { name_ar: '  A  ', description_ar: null, sectors: [] as string[] };
    await updateBusinessById({ id: 'b1', values });
    expect(builder.update).toHaveBeenCalledWith(values);
    // exact reference, no clone
    expect((builder.update.mock.calls[0]?.[0] as unknown)).toBe(values);
  });

  it('does not call .select() or .single()', async () => {
    await updateBusinessById({ id: 'b1', values: { name_ar: 'A' } });
    expect(builder.select).not.toHaveBeenCalled();
    expect(builder.single).not.toHaveBeenCalled();
  });

  it('returns raw { data, error } unchanged', async () => {
    builder = makeBuilder({ data: null, error: { message: 'rls' } });
    const r = await updateBusinessById({ id: 'b1', values: { name_ar: 'A' } });
    expect(r).toEqual({ data: null, error: { message: 'rls' } });
  });

  it('bubbles thrown Supabase errors', async () => {
    builder = {
      update: vi.fn(() => builder),
      eq: vi.fn(() => { throw new Error('boom'); }),
      select: vi.fn(() => builder),
      single: vi.fn(() => builder),
      then: () => Promise.resolve({ data: null, error: null }),
    } as unknown as Builder;
    await expect(updateBusinessById({ id: 'b1', values: { name_ar: 'A' } })).rejects.toThrow('boom');
  });
});

describe('migration regression: DashboardBusinessEdit', () => {
  const src = readFileSync(resolve(__dirname, '../../../../pages/dashboard/DashboardBusinessEdit.tsx'), 'utf8');
  it('no longer directly updates businesses via supabase.from', () => {
    expect(src).not.toMatch(/supabase\.from\(['"]businesses['"]\)\s*\.update/);
  });
  it('imports updateBusinessById from @/modules/businesses', () => {
    expect(src).toMatch(/updateBusinessById/);
    expect(src).toMatch(/from '@\/modules\/businesses'/);
  });
  it('preserves form.id as the update id source', () => {
    expect(src).toMatch(/updateBusinessById\(\{\s*id:\s*form\.id,\s*values:\s*payload\s*\}\)/);
  });
});

describe('migration regression: DashboardBusinessDraft', () => {
  const src = readFileSync(resolve(__dirname, '../../../../pages/dashboard/DashboardBusinessDraft.tsx'), 'utf8');
  it('no longer directly updates businesses via supabase.from', () => {
    expect(src).not.toMatch(/supabase\.from\(['"]businesses['"]\)\s*[\s\S]{0,80}\.update/);
  });
  it('imports updateBusinessById from @/modules/businesses', () => {
    expect(src).toMatch(/updateBusinessById/);
    expect(src).toMatch(/from '@\/modules\/businesses'/);
  });
  it('preserves business.id as the update id source', () => {
    expect(src).toMatch(/updateBusinessById\(\{\s*id:\s*business\.id,\s*values:\s*payload\s*\}\)/);
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
  it('preserves businessId as the update id source', () => {
    expect(src).toMatch(/updateBusinessById\(\{\s*id:\s*businessId,\s*values:\s*update\s*\}\)/);
  });
  it('preserves CR-scan payload fields exactly', () => {
    expect(src).toMatch(/cr_scan_raw/);
    expect(src).toMatch(/cr_scan_data/);
    expect(src).toMatch(/cr_scan_at/);
    expect(src).toMatch(/cr_document_url/);
    expect(src).toMatch(/cr_document_path/);
    expect(src).toMatch(/cr_document_mime/);
    expect(src).toMatch(/cr_document_size/);
    expect(src).toMatch(/cr_document_uploaded_at/);
    expect(src).toMatch(/cr_document_uploaded_by/);
  });
  it('preserves error throw path', () => {
    expect(src).toMatch(/if\s*\(\s*error\s*\)\s*throw\s+error/);
  });
  it('preserves admin-provider-review query invalidation', () => {
    expect(src).toMatch(/qc\.invalidateQueries\(\{\s*queryKey:\s*\['admin-provider-review'\]/);
  });
});
