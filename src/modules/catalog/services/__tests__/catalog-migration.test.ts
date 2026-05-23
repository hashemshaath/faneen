import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * CAT-2 regression lock: migrated read callsites must no longer call the
 * catalog tables directly via `supabase.from(...)` for the specific reads
 * that were migrated. Writes / unrelated reads remain direct (deferred to
 * CAT-3..CAT-5) and are asserted as such below.
 */

const read = (p: string) => readFileSync(resolve(process.cwd(), p), 'utf-8');

type Row = { path: string; table: string; service: string };

const MIGRATED: Row[] = [
  { path: 'src/components/business-profile/business-profile.data.ts', table: 'business_services', service: 'listServicesByBusiness' },
  { path: 'src/components/business-profile/business-profile.data.ts', table: 'business_branches', service: 'listBranchesByBusiness' },
  { path: 'src/components/bnpl/BnplBadges.tsx', table: 'bnpl_providers', service: 'listGlobalBnplProviders' },
  { path: 'src/components/booking/BookingWidget.tsx', table: 'business_availability', service: 'listPublicAvailabilityByBusiness' },
  { path: 'src/components/dashboard/ProviderTipsCard.tsx', table: 'business_services', service: 'countServicesByBusiness' },
  { path: 'src/pages/dashboard/overview/ProviderDashboardView.tsx', table: 'business_services', service: 'countServicesByBusiness' },
  { path: 'src/pages/dashboard/DashboardAnalytics.tsx', table: 'business_services', service: 'listServicesByBusiness' },
  { path: 'src/pages/ContractDetail.tsx', table: 'warranties', service: 'listWarrantiesForContract' },
];

describe('CAT-2 migrated callsites no longer touch catalog tables directly', () => {
  for (const { path, table, service } of MIGRATED) {
    it(`${path} -> ${service} replaces direct .from('${table}')`, () => {
      const src = read(path);
      expect(src).not.toMatch(new RegExp(`supabase\\.from\\(['"]${table}['"]\\)`));
      expect(src).toContain(service);
    });
  }
});

describe('CAT-2 mixed read+write files: reads migrated, writes intentionally deferred', () => {
  it('BnplProvidersManager: reads use catalog wrappers, writes remain direct', () => {
    const src = read('src/components/bnpl/BnplProvidersManager.tsx');
    expect(src).toContain('listGlobalBnplProviders');
    expect(src).toContain('listBusinessBnplProviders');
    // Direct list reads must be gone.
    expect(src).not.toMatch(/supabase\.from\(['"]bnpl_providers['"]\)\.select/);
    expect(src).not.toMatch(/supabase\.from\(['"]business_bnpl_providers['"]\)\.select/);
    // Writes migrated in CAT-5.
    expect(src).toContain('upsertBusinessBnplProvider');
    expect(src).toContain('updateBusinessBnplProviderForBusiness');
    expect(src).not.toMatch(/supabase\.from\(['"]business_bnpl_providers['"]\)/);
  });

  it('ProviderServiceAreas: read + writes fully migrated (CAT-2 read, CAT-3 writes)', () => {
    const src = read('src/pages/dashboard/ProviderServiceAreas.tsx');
    expect(src).toContain('listServiceAreasByBusiness');
    expect(src).not.toMatch(/supabase\.from\(['"]business_service_areas['"]\)/);
  });

  it('DashboardBookings: availability read + replace-pattern writes fully migrated', () => {
    const src = read('src/pages/dashboard/DashboardBookings.tsx');
    expect(src).toContain('listAvailabilityByBusiness');
    expect(src).not.toMatch(/supabase\.from\(['"]business_availability['"]\)/);
  });

  it('DashboardWarranties: list read + writes fully migrated (CAT-2 read, CAT-3 writes)', () => {
    const src = read('src/pages/dashboard/DashboardWarranties.tsx');
    expect(src).toContain('listWarrantiesByContractIds');
    expect(src).not.toMatch(/supabase\.from\(['"]warranties['"]\)/);
  });
});

describe('CAT-2 out-of-scope guardrail (must NOT be touched in this phase)', () => {
  it('DashboardServices CRUD remains direct (deferred to CAT-3)', () => {
    const src = read('src/pages/dashboard/DashboardServices.tsx');
    expect(src).toMatch(/supabase\.from\(['"]business_services['"]\)/);
  });
  it('DashboardInstallments BNPL admin writes migrated in CAT-5 (read remains direct)', () => {
    const src = read('src/pages/dashboard/DashboardInstallments.tsx');
    // Read intentionally left direct (per CAT-5 scope).
    expect(src).toMatch(/supabase\.from\(['"]bnpl_providers['"]\)\.select/);
    // Writes migrated.
    expect(src).not.toMatch(/supabase\.from\(['"]bnpl_providers['"]\)\.(insert|update|delete)/);
  });
  it('contracts aggregate warranties read remains owned by contracts module', () => {
    const src = read('src/modules/contracts/services/aggregates.ts');
    expect(src).toMatch(/\.from\(['"]warranties['"]\)/);
  });
});