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

/**
 * SERVICE-ACTIVATION-GOVERNANCE — DashboardServices ownership boundary:
 *   - `@/modules/providerServices` owns activation + governance state
 *     (is_active, provider_status, admin_status, required_plan_tier, …).
 *   - Direct `supabase.from('business_services')` reads/inserts/updates
 *     remain allowed for non-governance metadata (names, prices, etc.).
 *   - Catalog mutation wrappers (`updateBusinessServiceById`,
 *     `insertBusinessService`) must NOT be used here — their payload
 *     types now `Omit` governance fields, and the provider-services
 *     isolation audit guards `is_active` and the rest at the source level.
 */
describe('DashboardServices ownership: providerServices for activation, no catalog mutation wrappers', () => {
  const src = read('src/pages/dashboard/DashboardServices.tsx');

  it('routes activation through providerServices canonical setter', () => {
    expect(src).toContain('@/modules/providerServices');
    expect(src).toContain('setProviderServiceStatus');
  });

  it('does not import catalog mutation wrappers for business_services', () => {
    expect(src).not.toContain('updateBusinessServiceById');
    expect(src).not.toContain('insertBusinessService(');
    expect(src).not.toContain('deleteBusinessServiceById');
  });

  it('never writes governance fields directly on business_services', () => {
    // The provider-services isolation audit is the source of truth, but
    // we belt-and-brace here so a regression on this specific file fails
    // loudly in the test suite too.
    const guarded = [
      'is_active',
      'provider_status',
      'admin_status',
      'required_plan_tier',
      'requires_admin_review',
      'is_premium_service',
      'is_featured',
      'rejection_reason',
    ];
    // Capture every `.from('business_services').update({...})` /
    // `.insert({...})` call body and assert none of them set a
    // governance field.
    const re = /\.from\(['"]business_services['"]\)\s*\.\s*(update|insert|upsert)\s*\(/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(src)) !== null) {
      const openIdx = m.index + m[0].length - 1;
      let depth = 1;
      let i = openIdx + 1;
      for (; i < src.length && depth > 0; i++) {
        const ch = src[i];
        if (ch === '(') depth++;
        else if (ch === ')') depth--;
      }
      const body = src.slice(openIdx + 1, i - 1);
      for (const f of guarded) {
        expect(body, `governance field "${f}" written directly in ${m[1]}`)
          .not.toMatch(new RegExp(`\\b${f}\\s*:`));
      }
    }
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