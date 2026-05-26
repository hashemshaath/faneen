/**
 * WORKSPACE-CONTEXT-4D — migration audit for quote/lead dashboard surfaces.
 *
 * Access model audit:
 *  - DashboardLeads (provider inbox)  → staff-safe. Already enumerates
 *    owner + manager businesses via `getManagedBusinessesForUser`. We
 *    narrow the active business set when a workspace entity is picked
 *    but never widen access; RLS on lead_requests stays authoritative.
 *  - DashboardMyRequests (requester)  → user-scoped (auth.uid()), no
 *    business context to migrate.
 *  - ProviderLeads / ProviderLeadDetails → matched-leads surfaces keyed
 *    by sector / service area, no active business context.
 *  - QuoteRequestDetails → keyed by lead id, no business context.
 *
 * Migration rules verified:
 *  - DashboardLeads consumes useActiveWorkspace.
 *  - Active entity narrows the managed-business id list (no widening,
 *    no staff escalation; the staff/manager check still runs through
 *    `getManagedBusinessesForUser`).
 *  - Query key includes the active entity id so a workspace switch
 *    forces refetch.
 *  - Existing service wrappers preserved; no direct supabase.from
 *    introduced.
 *  - No contracts / payments / membership dashboard pages touched.
 *  - Requester / matched-lead surfaces remain unmigrated by design.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(process.cwd(), 'src');
const read = (rel: string): string => readFileSync(join(ROOT, rel), 'utf8');

const LEADS = 'pages/dashboard/DashboardLeads.tsx';

const UNCHANGED = [
  'pages/dashboard/DashboardMyRequests.tsx',
  'pages/dashboard/ProviderLeads.tsx',
  'pages/dashboard/ProviderLeadDetails.tsx',
  'pages/dashboard/QuoteRequestDetails.tsx',
];

describe('WORKSPACE-CONTEXT-4D — quotes / leads', () => {
  it('DashboardLeads exists and consumes useActiveWorkspace', () => {
    expect(existsSync(join(ROOT, LEADS))).toBe(true);
    const src = read(LEADS);
    expect(src).toContain("from '@/hooks/useActiveWorkspace'");
    expect(src).toContain('useActiveWorkspace(');
    expect(src).toContain('active_entity_id');
  });

  it('DashboardLeads narrows managed-business ids by the active entity', () => {
    const src = read(LEADS);
    // Active entity must be a member of the pre-existing managed list
    // (no widening, no escalation).
    expect(src).toMatch(/allIds\.includes\(active_entity_id\)/);
    expect(src).toContain("queryKey: ['provider-leads', ids.join(','), filter, active_entity_id]");
  });

  it('DashboardLeads preserves managed-business + lead service wrappers', () => {
    const src = read(LEADS);
    expect(src).toContain('getManagedBusinessesForUser');
    expect(src).toContain('listProviderLeadRequests');
    expect(src).toContain('updateLeadRequestStatus');
    expect(src).not.toMatch(/supabase\.from\(['"]lead_requests['"]\)/);
    expect(src).not.toMatch(/supabase\.from\(['"]businesses['"]\)/);
  });

  it('requester / matched-lead surfaces are not migrated (no business context)', () => {
    for (const p of UNCHANGED) {
      const src = read(p);
      expect(src, p).not.toContain("from '@/hooks/useActiveWorkspace'");
    }
  });

  it('migration did not touch contracts/payments/membership dashboard pages', () => {
    const dashDir = join(ROOT, 'pages/dashboard');
    const skip = /contract|payment|membership/i;
    for (const name of readdirSync(dashDir)) {
      if (!skip.test(name)) continue;
      const src = read(`pages/dashboard/${name}`);
      expect(src, name).not.toContain("from '@/hooks/useActiveWorkspace'");
    }
  });

  it('regression: no /dashboard/membership route reference, no href="#" introduced', () => {
    const src = read(LEADS);
    expect(src).not.toContain('/dashboard/membership');
    expect(src).not.toMatch(/href=["']#["']/);
  });
});