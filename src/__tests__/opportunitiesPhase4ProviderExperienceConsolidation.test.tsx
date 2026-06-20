import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { resolve, join } from 'node:path';
import * as repo from '@/modules/opportunities/repository';
import type { OpportunityAssignment } from '@/modules/opportunities/types';
import {
  OPPORTUNITY_ASSIGNMENT_STATUS_MAP,
  mapAssignmentStatus,
} from '@/modules/opportunities/status';

const root = resolve(__dirname, '..', '..');
const APP = readFileSync(resolve(root, 'src/App.tsx'), 'utf8');

/**
 * OPPORTUNITIES PHASE 4 — provider experience consolidation guards.
 *
 * Verifies:
 *  - `/dashboard/opportunities/assigned` is the canonical provider list.
 *  - Legacy provider list routes (rfq, rfq/inbox, provider/leads) are still
 *    registered but resolve to a redirect (no competing UI).
 *  - Detail routes are still wired.
 *  - The opportunities module never surfaces the «Provider Leads» label.
 */
describe('phase 4 — canonical provider route', () => {
  it('mounts DashboardRequestsHub at /dashboard/opportunities/assigned', () => {
    expect(APP).toMatch(
      /path="\/dashboard\/opportunities\/assigned"\s+element=\{<ProtectedRoute requireProvider><DashboardRequestsHub/,
    );
  });
});

describe('phase 4 — legacy provider routes still registered', () => {
  it.each([
    '/dashboard/leads',
    '/dashboard/rfq',
    '/dashboard/rfq/inbox',
    '/dashboard/rfq/:id',
    '/dashboard/provider/leads',
    '/dashboard/provider/leads/:id',
    '/admin/provider-leads',
  ])('legacy route %s exists', (p) => {
    expect(APP).toContain(`path="${p}"`);
  });

  it.each([
    ['/dashboard/rfq', '/dashboard/opportunities/assigned'],
    ['/dashboard/rfq/inbox', '/dashboard/opportunities/assigned'],
    ['/dashboard/provider/leads', '/dashboard/opportunities/assigned'],
  ])('legacy list route %s redirects to %s', (from, to) => {
    const re = new RegExp(
      `path="${from.replace(/\//g, '\\/')}"\\s+element=\\{<Navigate to="${to.replace(/\//g, '\\/')}"`,
    );
    expect(APP).toMatch(re);
  });
});

describe('phase 4 — domain wiring', () => {
  it('repository returns OpportunityAssignment[] for assigned list', () => {
    // Type-level check: function signature must surface OpportunityAssignment.
    const fn: (limit?: number) => Promise<OpportunityAssignment[]> =
      repo.listAssignedOpportunities;
    expect(typeof fn).toBe('function');
  });

  it('central assignment status mapping is the single source of truth', () => {
    expect(OPPORTUNITY_ASSIGNMENT_STATUS_MAP.contacted).toBe('receiving_bids');
    expect(mapAssignmentStatus('accepted')).toBe('matched');
    expect(mapAssignmentStatus(null)).toBe('unknown');
  });
});

describe('phase 4 — no «Provider Leads» wording in opportunities module', () => {
  it('every file under src/modules/opportunities avoids the literal label', () => {
    const dir = resolve(root, 'src/modules/opportunities');
    const stack = [dir];
    const offenders: string[] = [];
    while (stack.length) {
      const cur = stack.pop()!;
      for (const name of readdirSync(cur)) {
        const full = join(cur, name);
        const st = statSync(full);
        if (st.isDirectory()) stack.push(full);
        else if (/\.tsx?$/.test(name)) {
          const s = readFileSync(full, 'utf8');
          if (/Provider Leads/.test(s)) offenders.push(full);
        }
      }
    }
    expect(offenders, offenders.join('\n')).toEqual([]);
  });

  it('opportunities repository does not query provider_leads directly', () => {
    const src = readFileSync(
      resolve(root, 'src/modules/opportunities/repository.ts'),
      'utf8',
    );
    expect(src).not.toMatch(/\.from\(\s*['"]provider_leads['"]/);
    expect(src).not.toMatch(/\.rpc\(/);
    expect(src).not.toMatch(/from\s+['"]@\/integrations\/supabase/);
  });
});