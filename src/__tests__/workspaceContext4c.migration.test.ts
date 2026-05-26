/**
 * WORKSPACE-CONTEXT-4C — migration audit for DashboardBookings.
 *
 * Bookings is owner-only today (mutations write business_id derived from
 * the loaded owner business and existing RLS scopes to owner). This
 * audit confirms:
 *  - DashboardBookings consumes useActiveWorkspace.
 *  - The active entity is gated by source === 'owner' so staff
 *    memberships cannot escalate into provider booking management.
 *  - Canonical wrappers (getOwnerBusiness / listBusinessesByIds) are
 *    preserved; no new direct supabase.from('businesses') reads.
 *  - The owner-business query key includes the selected entity id so a
 *    workspace switch refetches the business + downstream bookings.
 *  - Migration did NOT touch contracts / payments / quotes / leads /
 *    memberships dashboard pages.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(process.cwd(), 'src');
const read = (rel: string): string => readFileSync(join(ROOT, rel), 'utf8');
const TARGET = 'pages/dashboard/DashboardBookings.tsx';

describe('WORKSPACE-CONTEXT-4C — DashboardBookings', () => {
  it('target page exists', () => {
    expect(existsSync(join(ROOT, TARGET))).toBe(true);
  });

  it('consumes useActiveWorkspace', () => {
    const src = read(TARGET);
    expect(src).toContain("from '@/hooks/useActiveWorkspace'");
    expect(src).toContain('useActiveWorkspace(');
    expect(src).toContain('active_entity_id');
  });

  it('gates the active entity by source === "owner"', () => {
    const src = read(TARGET);
    expect(src).toContain("source === 'owner'");
    expect(src).toContain('activeOwnerEntityId');
  });

  it('preserves canonical business read wrappers and avoids raw businesses reads', () => {
    const src = read(TARGET);
    expect(src).toContain('getOwnerBusiness');
    expect(src).toContain('listBusinessesByIds');
    expect(src).not.toMatch(/supabase\.from\(['"]businesses['"]\)/);
  });

  it('owner-business query key includes the active entity id', () => {
    const src = read(TARGET);
    expect(src).toContain("['my-business', user?.id, activeOwnerEntityId]");
  });

  it('did not touch contracts/payments/quotes/leads/memberships dashboard pages', () => {
    const dashDir = join(ROOT, 'pages/dashboard');
    const skip = /contract|payment|quote|lead|membership/i;
    for (const name of readdirSync(dashDir)) {
      if (!skip.test(name)) continue;
      const src = read(`pages/dashboard/${name}`);
      expect(src, name).not.toContain("from '@/hooks/useActiveWorkspace'");
    }
  });
});