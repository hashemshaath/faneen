import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const read = (p: string) => readFileSync(resolve(p), 'utf8');

describe('CRED-3 admin credit-adjustment relocation', () => {
  it('AdminProviderSubscriptions imports adminAdjustProviderCredits from @/modules/credits', () => {
    const src = read('src/pages/admin/AdminProviderSubscriptions.tsx');
    expect(src).toMatch(
      /import\s*\{[^}]*adminAdjustProviderCredits[^}]*\}\s*from\s*['"]@\/modules\/credits['"]/s,
    );
    // Must not import it from memberships anymore.
    const membershipsImport = src.match(
      /import\s*\{([^}]*)\}\s*from\s*['"]@\/modules\/memberships['"]/s,
    );
    expect(membershipsImport).not.toBeNull();
    expect(membershipsImport?.[1] ?? '').not.toContain('adminAdjustProviderCredits');
  });

  it('memberships providerSubscriptions/mutations.ts re-exports adminAdjustProviderCredits as a shim', () => {
    const src = read('src/modules/memberships/services/providerSubscriptions/mutations.ts');
    expect(src).toMatch(
      /export\s*\{[^}]*adminAdjustProviderCredits[^}]*\}\s*from\s*['"]@\/modules\/credits['"]/s,
    );
    // Shim must not call the RPC itself anymore.
    expect(src).not.toMatch(/supabase\.rpc\(\s*['"]admin_adjust_provider_credits['"]/);
  });

  it('canonical RPC call lives only in credits admin mutations', () => {
    const credits = read('src/modules/credits/services/admin/mutations.ts');
    expect(credits).toMatch(/supabase\.rpc\(\s*['"]admin_adjust_provider_credits['"]/);
  });
});