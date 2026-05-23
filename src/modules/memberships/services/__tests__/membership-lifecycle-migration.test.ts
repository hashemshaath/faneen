import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const read = (p: string) => readFileSync(resolve(p), 'utf8');

describe('MEMB-3 lifecycle migration', () => {
  it('AdminMemberships uses lifecycle wrappers', () => {
    const src = read('src/pages/admin/AdminMemberships.tsx');
    expect(src).toContain("from '@/modules/memberships'");
    expect(src).toContain('cancelSubscription');
    expect(src).toContain('adminUpgradeSubscription');
    expect(src).toContain('subscribeToPlan');
    expect(src).not.toMatch(/supabase\.rpc\(\s*['"]cancel_subscription['"]/);
    expect(src).not.toMatch(/supabase\.rpc\(\s*['"]admin_upgrade_subscription['"]/);
    expect(src).not.toMatch(/supabase\.rpc\(\s*['"]subscribe_to_plan['"]/);
    // Admin reads fully migrated in MEMB-7.
    expect(src).not.toMatch(/\.from\(['"]membership_plans['"]\)/);
  });

  it('Membership page no longer calls lifecycle RPCs directly', () => {
    const src = read('src/pages/Membership.tsx');
    expect(src).not.toMatch(/supabase\.rpc\(\s*['"]subscribe_to_plan['"]/);
    expect(src).not.toMatch(/supabase\.rpc\(\s*['"]cancel_subscription_at_period_end['"]/);
    expect(src).not.toMatch(/supabase\.rpc\(\s*['"]resume_subscription_renewal['"]/);
  });

  it('AdminUpgradeRequestsPanel uses subscribeToPlan wrapper (migrated in MEMB-4)', () => {
    const panel = read('src/components/membership/AdminUpgradeRequestsPanel.tsx');
    expect(panel).not.toMatch(/supabase\.rpc\(\s*['"]subscribe_to_plan['"]/);
    expect(panel).toContain('subscribeToPlan');
  });
});