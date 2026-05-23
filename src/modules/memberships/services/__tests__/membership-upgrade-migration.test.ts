import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const read = (p: string) => readFileSync(resolve(p), 'utf8');

describe('MEMB-4 upgrade requests / rejections / events migration', () => {
  it('AdminUpgradeRequestsPanel uses membership services and drops direct table/RPC access', () => {
    const src = read('src/components/membership/AdminUpgradeRequestsPanel.tsx');
    expect(src).toContain("from '@/modules/memberships'");
    expect(src).toContain('listMembershipUpgradeRequests');
    expect(src).toContain('updateMembershipUpgradeRequestById');
    expect(src).toContain('subscribeToPlan');
    expect(src).not.toMatch(/\.from\(['"]membership_upgrade_requests['"]\)/);
    expect(src).not.toMatch(/supabase\.rpc\(\s*['"]subscribe_to_plan['"]/);
    // Fail-soft email/notification wrappers from prior tracks remain in use.
    expect(src).toContain('sendTransactionalEmail');
    expect(src).toContain('createNotification');
  });

  it('Membership page uses upgrade request wrappers', () => {
    const src = read('src/pages/Membership.tsx');
    expect(src).toContain('findPendingMembershipUpgradeRequest');
    expect(src).toContain('insertMembershipUpgradeRequest');
    expect(src).toContain('listMyPendingMembershipUpgradeRequests');
    expect(src).not.toMatch(/\.from\(['"]membership_upgrade_requests['"]\)/);
    // MEMB-2/3 wrappers remain.
    expect(src).toContain('listActiveMembershipPlans');
    expect(src).toContain('subscribeToPlan');
    expect(src).toContain('cancelSubscriptionAtPeriodEnd');
    expect(src).toContain('resumeSubscriptionRenewal');
  });

  it('AdminMembershipRejections uses queryMembershipUpgradeRejections', () => {
    const src = read('src/pages/admin/AdminMembershipRejections.tsx');
    expect(src).toContain('queryMembershipUpgradeRejections');
    expect(src).not.toMatch(/\.from\(['"]membership_upgrade_rejections['"]\)/);
    // Local applyFilters callback preserved so existing filter logic is untouched.
    expect(src).toContain('applyFilters');
  });

  it('AdminMembershipEvents uses listRecentMembershipSubscriptionEvents', () => {
    const src = read('src/pages/admin/AdminMembershipEvents.tsx');
    expect(src).toContain('listRecentMembershipSubscriptionEvents');
    expect(src).not.toMatch(/\.from\(['"]membership_subscription_events['"]\)/);
  });

  it('invite/access (MEMB-5) and promo (MEMB-6) are migrated; provider legacy deferred to MEMB-7', () => {
    // Sanity-only: invite/access were migrated in MEMB-5, promo in MEMB-6.
    // Provider legacy paths (provider_plans/provider_subscriptions) remain
    // deferred and are tracked by their own phase.
    const keys = read('src/components/membership/MembershipKeysManager.tsx');
    const promo = read('src/components/membership/PromoCodeRedeem.tsx');
    expect(keys).not.toMatch(/from\s+['"]@\/integrations\/supabase\/client['"]/);
    expect(promo).not.toMatch(/from\s+['"]@\/integrations\/supabase\/client['"]/);
  });
});