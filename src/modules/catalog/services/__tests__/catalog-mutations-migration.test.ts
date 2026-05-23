import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * CAT-3 regression lock: provider-owned write callsites must no longer
 * directly invoke `supabase.from(...).insert/.update/.delete` for the
 * migrated tables. Admin / BNPL writes remain deferred and are asserted
 * as still-direct below.
 */

const read = (p: string) => readFileSync(resolve(process.cwd(), p), 'utf-8');

describe('CAT-3 DashboardServices migrated provider writes', () => {
  const src = read('src/pages/dashboard/DashboardServices.tsx');

  it('imports the new catalog mutation services', () => {
    expect(src).toContain('insertBusinessService');
    expect(src).toContain('insertBusinessServices');
    expect(src).toContain('updateBusinessServiceById');
    expect(src).toContain('deleteBusinessServiceById');
    expect(src).toContain('deleteDemoBusinessServicesForBusiness');
  });

  it('no longer issues direct write calls against business_services', () => {
    expect(src).not.toMatch(/supabase\.from\(['"]business_services['"]\)\s*\.insert/);
    expect(src).not.toMatch(/supabase\.from\(['"]business_services['"]\)\s*\.update/);
    expect(src).not.toMatch(/supabase\.from\(['"]business_services['"]\)\s*\.delete/);
  });

  it('read is now also migrated through listServicesByBusiness (CAT-6)', () => {
    expect(src).not.toMatch(/supabase\.from\(['"]business_services['"]\)\.select\(/);
    expect(src).toContain('listServicesByBusiness');
  });
});

describe('CAT-3 ProviderServiceAreas migrated provider writes', () => {
  const src = read('src/pages/dashboard/ProviderServiceAreas.tsx');

  it('uses the new catalog mutation services and the CAT-2 read wrapper', () => {
    expect(src).toContain('listServiceAreasByBusiness');
    expect(src).toContain('insertServiceArea');
    expect(src).toContain('deleteServiceAreaById');
    expect(src).toContain('clearPrimaryServiceAreasForBusiness');
    expect(src).toContain('setServiceAreaPrimaryById');
  });

  it('no longer touches business_service_areas via supabase.from directly', () => {
    expect(src).not.toMatch(/supabase\.from\(['"]business_service_areas['"]\)/);
  });
});

describe('CAT-3 DashboardBookings availability replace flow migrated', () => {
  const src = read('src/pages/dashboard/DashboardBookings.tsx');

  it('uses CAT-2 read wrapper and new CAT-3 mutation wrappers', () => {
    expect(src).toContain('listAvailabilityByBusiness');
    expect(src).toContain('deleteAvailabilityForBusiness');
    expect(src).toContain('insertAvailabilityRows');
  });

  it('no longer touches business_availability via supabase.from directly', () => {
    expect(src).not.toMatch(/supabase\.from\(['"]business_availability['"]\)/);
  });

  it('still gates the bulk insert on slots.length > 0 (preserves empty-rows guard)', () => {
    expect(src).toMatch(/if \(slots\.length > 0\)/);
  });
});

describe('CAT-3 DashboardWarranties provider writes migrated', () => {
  const src = read('src/pages/dashboard/DashboardWarranties.tsx');

  it('uses the new catalog warranty mutation services', () => {
    expect(src).toContain('insertWarranty');
    expect(src).toContain('updateWarrantyById');
    expect(src).toContain('deleteWarrantyById');
  });

  it('no longer touches warranties via supabase.from directly', () => {
    expect(src).not.toMatch(/supabase\.from\(['"]warranties['"]\)/);
  });
});

describe('CAT-3 out-of-scope guardrails (post CAT-5: BNPL migrated)', () => {
  it('BnplProvidersManager business_bnpl_providers writes migrated in CAT-5', () => {
    const src = read('src/components/bnpl/BnplProvidersManager.tsx');
    expect(src).not.toMatch(/supabase\.from\(['"]business_bnpl_providers['"]\)/);
    expect(src).toContain('upsertBusinessBnplProvider');
  });

  it('DashboardInstallments BNPL admin CRUD migrated in CAT-5', () => {
    const src = read('src/pages/dashboard/DashboardInstallments.tsx');
    expect(src).not.toMatch(/supabase\.from\(['"]bnpl_providers['"]\)\.(insert|update|delete)/);
  });

  it('contracts aggregate warranties service is untouched and still owned by contracts module', () => {
    const src = read('src/modules/contracts/services/aggregates.ts');
    expect(src).toMatch(/\.from\(['"]warranties['"]\)/);
  });
});