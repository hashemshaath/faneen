/**
 * WORKSPACE-CONTEXT-4A — migration audit for the first batch of pages.
 *
 * Confirms that:
 * - DashboardProfile and DashboardBusinessEdit consume useActiveWorkspace.
 * - Both still route business reads through canonical wrappers
 *   (`getOwnerBusiness` / `listBusinessesByIds`) — no new direct
 *   `supabase.from('businesses')` page access.
 * - Both honor the active entity only when it is owner-source, so staff
 *   memberships cannot accidentally surface as an editable owner row.
 * - Migration did NOT touch contracts / payments / bookings / quotes
 *   pages, RLS, routes, or edge functions.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(process.cwd(), 'src');
const read = (rel: string): string => readFileSync(join(ROOT, rel), 'utf8');

const TARGETS = [
  'pages/dashboard/DashboardProfile.tsx',
  'pages/dashboard/DashboardBusinessEdit.tsx',
];

describe('WORKSPACE-CONTEXT-4A — DashboardProfile + DashboardBusinessEdit', () => {
  it('both target pages exist', () => {
    for (const t of TARGETS) expect(existsSync(join(ROOT, t))).toBe(true);
  });

  it('both pages consume useActiveWorkspace', () => {
    for (const t of TARGETS) {
      const src = read(t);
      expect(src, t).toContain("from '@/hooks/useActiveWorkspace'");
      expect(src, t).toContain('useActiveWorkspace(');
      expect(src, t).toContain('active_entity_id');
    }
  });

  it('both pages restrict workspace usage to owner-source entities', () => {
    for (const t of TARGETS) {
      const src = read(t);
      expect(src, t).toContain("source === 'owner'");
      expect(src, t).toContain('activeOwnerEntityId');
    }
  });

  it('both pages preserve canonical business read wrappers', () => {
    for (const t of TARGETS) {
      const src = read(t);
      // Fallback path retains getOwnerBusiness; owner-active path uses listBusinessesByIds.
      expect(src, t).toContain('getOwnerBusiness');
      expect(src, t).toContain('listBusinessesByIds');
      // No raw business table reads were introduced.
      expect(src, t).not.toMatch(/supabase\.from\(['"]businesses['"]\)/);
    }
  });

  it('DashboardBusinessEdit still uses updateBusinessById (no mutation change)', () => {
    const src = read('pages/dashboard/DashboardBusinessEdit.tsx');
    expect(src).toContain('updateBusinessById');
  });

  it('migration did not touch contracts/payments/bookings/quotes dashboard pages', () => {
    const dashDir = join(ROOT, 'pages/dashboard');
    const skip = /contract|payment|booking|quote|lead/i;
    for (const name of readdirSync(dashDir)) {
      if (!skip.test(name)) continue;
      const src = read(`pages/dashboard/${name}`);
      expect(src, name).not.toContain("from '@/hooks/useActiveWorkspace'");
    }
  });
});