import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * CAT-5 regression lock: BNPL write callsites must no longer issue
 * direct `supabase.from('bnpl_providers' | 'business_bnpl_providers')`
 * insert/update/delete/upsert calls.
 */

const read = (p: string) => readFileSync(resolve(process.cwd(), p), 'utf-8');

describe('CAT-5 DashboardInstallments BNPL admin writes migrated', () => {
  const src = read('src/pages/dashboard/DashboardInstallments.tsx');

  it('imports the new BNPL mutation services', () => {
    expect(src).toContain('insertBnplProvider');
    expect(src).toContain('updateBnplProviderById');
    expect(src).toContain('deleteBnplProviderById');
  });

  it('no longer issues direct write calls against bnpl_providers', () => {
    expect(src).not.toMatch(/supabase\.from\(['"]bnpl_providers['"]\)\s*\.insert/);
    expect(src).not.toMatch(/supabase\.from\(['"]bnpl_providers['"]\)\s*\.update/);
    expect(src).not.toMatch(/supabase\.from\(['"]bnpl_providers['"]\)\s*\.delete/);
  });
});

describe('CAT-5 BnplProvidersManager per-business writes migrated', () => {
  const src = read('src/components/bnpl/BnplProvidersManager.tsx');

  it('imports the new BNPL mutation services', () => {
    expect(src).toContain('upsertBusinessBnplProvider');
    expect(src).toContain('updateBusinessBnplProviderForBusiness');
  });

  it('no longer issues direct write calls against business_bnpl_providers', () => {
    expect(src).not.toMatch(/supabase\.from\(['"]business_bnpl_providers['"]\)/);
  });

  it('still preserves the upsert conflict target in the call argument', () => {
    expect(src).toMatch(/onConflict:\s*['"]business_id,bnpl_provider_id['"]/);
  });

  it('CAT-2 BNPL read wrappers remain in use', () => {
    expect(src).toContain('listGlobalBnplProviders');
    expect(src).toContain('listBusinessBnplProviders');
  });
});

describe('CAT-5 prior catalog migrations remain intact', () => {
  it('contracts aggregate warranties read remains owned by contracts module', () => {
    const src = read('src/modules/contracts/services/aggregates.ts');
    expect(src).toMatch(/\.from\(['"]warranties['"]\)/);
  });
});