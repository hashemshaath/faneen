import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * CAT-5B regression lock: DashboardInstallments admin list read of
 * `bnpl_providers` must use the catalog read wrapper, not direct
 * `supabase.from('bnpl_providers')`.
 */
const read = (p: string) => readFileSync(resolve(process.cwd(), p), 'utf-8');

describe('CAT-5B DashboardInstallments bnpl_providers admin read migrated', () => {
  const src = read('src/pages/dashboard/DashboardInstallments.tsx');

  it('imports the listGlobalBnplProviders read wrapper', () => {
    expect(src).toContain('listGlobalBnplProviders');
  });

  it('no longer issues any direct supabase.from(bnpl_providers) calls', () => {
    expect(src).not.toMatch(/supabase\.from\(['"]bnpl_providers['"]\)/);
  });

  it('preserves the sort_order ordering through the wrapper', () => {
    expect(src).toMatch(/listGlobalBnplProviders[\s\S]{0,120}order:\s*['"]sort_order['"]/);
  });

  it('CAT-5 mutation wrappers remain in use', () => {
    expect(src).toContain('insertBnplProvider');
    expect(src).toContain('updateBnplProviderById');
    expect(src).toContain('deleteBnplProviderById');
  });
});

describe('CAT-5B contracts warranties aggregate remains intentionally allowed', () => {
  it('contracts aggregate still owns the warranties read', () => {
    const src = read('src/modules/contracts/services/aggregates.ts');
    expect(src).toMatch(/\.from\(['"]warranties['"]\)/);
  });
});