/**
 * WORKSPACE-CONTEXT-4B — migration audit for the second batch of pages.
 *
 * Confirms that:
 * - DashboardBadge, DashboardPrivateSectors, DashboardServices, and
 *   DashboardReviews all consume useActiveWorkspace.
 * - Owner-only pages (Services, Reviews) gate the active entity by
 *   source === 'owner' so staff memberships cannot escalate into
 *   owner-managed catalogs.
 * - Provider/staff-safe pages (Badge, PrivateSectors) drop the legacy
 *   useActiveBusiness hook in favor of useActiveWorkspace.
 * - Canonical business wrappers remain in use; no new direct
 *   supabase.from('businesses') reads were introduced.
 * - Migration did NOT touch contracts / payments / bookings / quotes /
 *   leads dashboard pages.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(process.cwd(), 'src');
const read = (rel: string): string => readFileSync(join(ROOT, rel), 'utf8');

const ALL_TARGETS = [
  'pages/dashboard/DashboardBadge.tsx',
  'pages/dashboard/DashboardPrivateSectors.tsx',
  'pages/dashboard/DashboardServices.tsx',
  'pages/dashboard/DashboardReviews.tsx',
];

const OWNER_ONLY = [
  'pages/dashboard/DashboardServices.tsx',
  'pages/dashboard/DashboardReviews.tsx',
];

const STAFF_SAFE = [
  'pages/dashboard/DashboardBadge.tsx',
  'pages/dashboard/DashboardPrivateSectors.tsx',
];

describe('WORKSPACE-CONTEXT-4B — Badge / PrivateSectors / Services / Reviews', () => {
  it('all target pages exist', () => {
    for (const t of ALL_TARGETS) expect(existsSync(join(ROOT, t))).toBe(true);
  });

  it('all target pages consume useActiveWorkspace', () => {
    for (const t of ALL_TARGETS) {
      const src = read(t);
      expect(src, t).toContain("from '@/hooks/useActiveWorkspace'");
      expect(src, t).toContain('useActiveWorkspace(');
      expect(src, t).toContain('active_entity_id');
    }
  });

  it('staff-safe pages dropped the legacy useActiveBusiness hook', () => {
    for (const t of STAFF_SAFE) {
      const src = read(t);
      expect(src, t).not.toContain("from '@/hooks/useActiveBusiness'");
      expect(src, t).not.toContain('useActiveBusiness(');
    }
  });

  it('owner-only pages gate the active entity by source === "owner"', () => {
    for (const t of OWNER_ONLY) {
      const src = read(t);
      expect(src, t).toContain("source === 'owner'");
      expect(src, t).toContain('activeOwnerEntityId');
    }
  });

  it('owner-only pages preserve canonical business read wrappers', () => {
    for (const t of OWNER_ONLY) {
      const src = read(t);
      expect(src, t).toContain('getOwnerBusiness');
      expect(src, t).toContain('listBusinessesByIds');
      expect(src, t).not.toMatch(/supabase\.from\(['"]businesses['"]\)/);
    }
  });

  it('migration did not touch contracts/payments/quotes/leads pages', () => {
    const dashDir = join(ROOT, 'pages/dashboard');
    // bookings was intentionally migrated in WORKSPACE-CONTEXT-4C.
    const skip = /contract|payment|quote|lead/i;
    for (const name of readdirSync(dashDir)) {
      if (!skip.test(name)) continue;
      const src = read(`pages/dashboard/${name}`);
      expect(src, name).not.toContain("from '@/hooks/useActiveWorkspace'");
    }
  });
});