import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

type Builder = {
  select: ReturnType<typeof vi.fn>;
  insert: ReturnType<typeof vi.fn>;
  update: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
  eq: ReturnType<typeof vi.fn>;
  order: ReturnType<typeof vi.fn>;
  limit: ReturnType<typeof vi.fn>;
  then: (fn: (v: unknown) => unknown) => Promise<unknown>;
};

function makeBuilder(result: { data?: unknown; error: unknown; count?: number | null }): Builder {
  const b: Record<string, unknown> = {};
  const chain = () => b as unknown as Builder;
  b.select = vi.fn(chain);
  b.insert = vi.fn(chain);
  b.update = vi.fn(chain);
  b.delete = vi.fn(chain);
  b.eq = vi.fn(chain);
  b.order = vi.fn(chain);
  b.limit = vi.fn(chain);
  b.then = (onFulfilled: (v: unknown) => unknown) =>
    Promise.resolve(result).then(onFulfilled);
  return b as unknown as Builder;
}

let builder: Builder;
const fromMock = vi.fn((_table: string) => builder);

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: (t: string) => fromMock(t) },
}));

import { listAllBusinessServicesLite } from '../services/admin';
import {
  insertBusinessBranch,
  updateBusinessBranchById,
  deleteBusinessBranchById,
} from '../branches/mutations';
import {
  listAdminServiceAreasWithBusinesses,
  countAllServiceAreas,
} from '../serviceAreas/admin';

beforeEach(() => {
  fromMock.mockClear();
  builder = makeBuilder({ data: [], error: null, count: 0 });
});

describe('CAT-4 services admin wrapper', () => {
  it('listAllBusinessServicesLite uses exact default select and no filters', async () => {
    await listAllBusinessServicesLite();
    expect(fromMock).toHaveBeenCalledWith('business_services');
    expect(builder.select).toHaveBeenCalledWith('id, name_ar, name_en, business_id');
    expect(builder.eq).not.toHaveBeenCalled();
  });

  it('listAllBusinessServicesLite forwards custom select string', async () => {
    await listAllBusinessServicesLite('id, name_ar');
    expect(builder.select).toHaveBeenCalledWith('id, name_ar');
  });
});

describe('CAT-4 branches mutation wrappers', () => {
  it('insertBusinessBranch passes payload identity to business_branches', async () => {
    const payload = { business_id: 'b1', name_ar: 'Main' } as Parameters<typeof insertBusinessBranch>[0];
    await insertBusinessBranch(payload);
    expect(fromMock).toHaveBeenCalledWith('business_branches');
    expect(builder.insert.mock.calls[0][0]).toBe(payload);
  });

  it('updateBusinessBranchById applies values + eq id', async () => {
    const values = { is_active: false } as Parameters<typeof updateBusinessBranchById>[1];
    await updateBusinessBranchById('br1', values);
    expect(builder.update.mock.calls[0][0]).toBe(values);
    expect(builder.eq).toHaveBeenCalledWith('id', 'br1');
  });

  it('deleteBusinessBranchById deletes by id', async () => {
    await deleteBusinessBranchById('br1');
    expect(builder.delete).toHaveBeenCalledTimes(1);
    expect(builder.eq).toHaveBeenCalledWith('id', 'br1');
  });

  it('bubbles raw error envelope', async () => {
    builder = makeBuilder({ error: { message: 'boom' } });
    const r = await deleteBusinessBranchById('br1');
    expect(r.error).toEqual({ message: 'boom' });
  });
});

describe('CAT-4 service areas admin wrappers', () => {
  it('listAdminServiceAreasWithBusinesses uses the exact join select, ordering and limit', async () => {
    await listAdminServiceAreasWithBusinesses();
    expect(fromMock).toHaveBeenCalledWith('business_service_areas');
    expect(builder.select).toHaveBeenCalledWith(
      'id, business_id, city, district, is_primary, businesses!inner(name_ar, ref_id)',
    );
    expect(builder.order).toHaveBeenCalledWith('created_at', { ascending: false });
    expect(builder.limit).toHaveBeenCalledWith(1000);
  });

  it('countAllServiceAreas uses head/count exact with no filters', async () => {
    builder = makeBuilder({ error: null, count: 42 });
    const r = await countAllServiceAreas();
    expect(fromMock).toHaveBeenCalledWith('business_service_areas');
    expect(builder.select).toHaveBeenCalledWith('id', { count: 'exact', head: true });
    expect(builder.eq).not.toHaveBeenCalled();
    expect(r.count).toBe(42);
  });
});

/* ─── Source-level migration regression ─── */

const read = (p: string) => readFileSync(resolve(process.cwd(), p), 'utf-8');

describe('CAT-4 AdminBusinesses migrated', () => {
  const src = read('src/pages/admin/AdminBusinesses.tsx');

  it('imports the new catalog wrappers', () => {
    expect(src).toContain('listServicesByBusiness');
    expect(src).toContain('listAllBusinessServicesLite');
    expect(src).toContain('listBranchesByBusiness');
    expect(src).toContain('insertBusinessService');
    expect(src).toContain('updateBusinessServiceById');
    expect(src).toContain('deleteBusinessServiceById');
    expect(src).toContain('insertBusinessBranch');
    expect(src).toContain('updateBusinessBranchById');
    expect(src).toContain('deleteBusinessBranchById');
  });

  it('no longer issues direct calls against business_services / business_branches', () => {
    expect(src).not.toMatch(/supabase\.from\(['"]business_services['"]\)/);
    expect(src).not.toMatch(/supabase\.from\(['"]business_branches['"]\)/);
  });
});

describe('CAT-4 AdminBusinessServiceAreas migrated', () => {
  const src = read('src/pages/admin/locations/AdminBusinessServiceAreas.tsx');

  it('imports new admin/service-area wrappers', () => {
    expect(src).toContain('listAdminServiceAreasWithBusinesses');
    expect(src).toContain('insertServiceArea');
    expect(src).toContain('deleteServiceAreaById');
    expect(src).toContain('clearPrimaryServiceAreasForBusiness');
    expect(src).toContain('setServiceAreaPrimaryById');
  });

  it('no longer touches business_service_areas via supabase.from directly', () => {
    expect(src).not.toMatch(/supabase\.from\(['"]business_service_areas['"]\)/);
  });

  it('preserves clear-then-set primary ordering', () => {
    const clearIdx = src.indexOf('clearPrimaryServiceAreasForBusiness');
    const setIdx = src.indexOf('setServiceAreaPrimaryById');
    expect(clearIdx).toBeGreaterThan(-1);
    expect(setIdx).toBeGreaterThan(clearIdx);
  });
});

describe('CAT-4 AdminLocationsHub migrated', () => {
  const src = read('src/pages/admin/locations/AdminLocationsHub.tsx');

  it('uses countAllServiceAreas instead of direct head/count', () => {
    expect(src).toContain('countAllServiceAreas');
    expect(src).not.toMatch(/supabase\.from\(['"]business_service_areas['"]\)/);
  });
});

describe('CAT-4 still-deferred guardrails', () => {
  it('BnplProvidersManager business_bnpl_providers writes remain direct (CAT-5)', () => {
    const src = read('src/components/bnpl/BnplProvidersManager.tsx');
    expect(src).toMatch(/supabase\.from\(['"]business_bnpl_providers['"]\)/);
  });

  it('DashboardInstallments BNPL admin CRUD remains direct (CAT-5)', () => {
    const src = read('src/pages/dashboard/DashboardInstallments.tsx');
    expect(src).toMatch(/supabase\.from\(['"]bnpl_providers['"]\)/);
  });
});