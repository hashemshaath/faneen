/**
 * WORKSPACE-CONTEXT-4E — migration audit for contract dashboard surfaces.
 *
 * Access model audit:
 *  - DashboardContracts (provider create + dual provider/client list) →
 *    list queries are user-scoped via `listContractsForRole` (no business
 *    context). The only business context is the `business_id` stamped
 *    on a newly created contract. We resolve that id from the active
 *    workspace entity only when it points at an owned business
 *    (source === 'owner'); staff memberships never escalate into
 *    provider contract creation. Falls back to `getOwnerBusiness` so
 *    single-business owners are unaffected.
 *  - DashboardContractAnalytics → already enumerates owner + staff-
 *    managed businesses via `listOwnerBusinesses` +
 *    `listManagedStaffMembershipForUser`. We sync the analytics scope
 *    selector to the active workspace entity only when it is already
 *    present in that managed list. The underlying RPC still enforces
 *    authorization, so no widening occurs.
 *  - ContractDetail → keyed by contract id; business context is read
 *    off the contract row itself. No workspace migration needed.
 *
 * Migration rules verified:
 *  - Migrated contract pages consume `useActiveWorkspace`.
 *  - Owner-only contract creation gates by `source === 'owner'`.
 *  - Query keys include the active entity id so a workspace switch
 *    refetches.
 *  - Existing service wrappers preserved; no new direct
 *    `supabase.from('contracts')` access introduced from these pages.
 *  - No payments / membership dashboard pages touched.
 *  - No route or /r resolver changes.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(process.cwd(), 'src');
const read = (rel: string): string => readFileSync(join(ROOT, rel), 'utf8');

const CONTRACTS = 'pages/dashboard/DashboardContracts.tsx';
const ANALYTICS = 'pages/dashboard/DashboardContractAnalytics.tsx';

describe('WORKSPACE-CONTEXT-4E — contracts', () => {
  it('DashboardContracts consumes useActiveWorkspace and gates by owner source', () => {
    expect(existsSync(join(ROOT, CONTRACTS))).toBe(true);
    const src = read(CONTRACTS);
    expect(src).toContain("from '@/hooks/useActiveWorkspace'");
    expect(src).toContain('useActiveWorkspace(');
    expect(src).toContain('activeOwnerEntityId');
    expect(src).toMatch(/source === 'owner'/);
  });

  it('DashboardContracts businessId query key includes the active owner entity', () => {
    const src = read(CONTRACTS);
    expect(src).toContain("['my-business-id-contracts', user?.id, activeOwnerEntityId]");
  });

  it('DashboardContracts preserves contract service wrappers (no new direct supabase.from(contracts))', () => {
    const src = read(CONTRACTS);
    expect(src).toContain('listContractsForRole');
    expect(src).toContain('createContractFromTemplate');
    expect(src).toContain('listBusinessesByIds');
    expect(src).toContain('getOwnerBusiness');
    // No new direct table writes against contracts from this page.
    expect(src).not.toMatch(/supabase\.from\(['"]contracts['"]\)/);
  });

  it('DashboardContractAnalytics consumes useActiveWorkspace and aligns scope to managed list', () => {
    const src = read(ANALYTICS);
    expect(src).toContain("from '@/hooks/useActiveWorkspace'");
    expect(src).toContain('useActiveWorkspace(');
    // Sync only when the active entity is already in the managed list.
    expect(src).toMatch(/businessOptions\.some\(\(b\) => b\.id === active_entity_id\)/);
    expect(src).toContain('listOwnerBusinesses');
    expect(src).toContain('listManagedStaffMembershipForUser');
  });

  it('did not touch payments/membership dashboard pages', () => {
    const dashDir = join(ROOT, 'pages/dashboard');
    const skip = /payment|membership/i;
    for (const name of readdirSync(dashDir)) {
      if (!skip.test(name)) continue;
      const src = read(`pages/dashboard/${name}`);
      expect(src, name).not.toContain("from '@/hooks/useActiveWorkspace'");
    }
  });

  it('regression: contract pages introduce no /dashboard/membership refs or href="#"', () => {
    for (const p of [CONTRACTS, ANALYTICS]) {
      const src = read(p);
      expect(src, p).not.toContain('/dashboard/membership');
      expect(src, p).not.toMatch(/href=["']#["']/);
    }
  });
});