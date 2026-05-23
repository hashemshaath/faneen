import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const read = (p: string) => readFileSync(resolve(p), 'utf8');

describe('MEMB-2 callsite migration', () => {
  it('useMembershipLimits uses listActiveMembershipPlans wrapper', () => {
    const src = read('src/hooks/useMembershipLimits.ts');
    expect(src).toContain("from '@/modules/memberships'");
    expect(src).toContain('listActiveMembershipPlans');
    expect(src).not.toMatch(/\.from\(['"]membership_plans['"]\)/);
    expect(src).not.toContain("from '@/integrations/supabase/client'");
  });

  it('useFeatureGate uses hasMembershipFeature wrapper', () => {
    const src = read('src/hooks/useFeatureGate.ts');
    expect(src).toContain('hasMembershipFeature');
    expect(src).not.toMatch(/supabase\.rpc\(['"]has_membership_feature['"]/);
  });

  it('MembershipSection migrated', () => {
    const src = read('src/components/home/MembershipSection.tsx');
    expect(src).toContain('listActiveMembershipPlans');
    expect(src).not.toMatch(/\.from\(['"]membership_plans['"]\)/);
  });

  it('PlanFeatureMatrix migrated', () => {
    const src = read('src/components/membership/PlanFeatureMatrix.tsx');
    expect(src).toContain('listActiveMembershipPlans');
    expect(src).not.toMatch(/\.from\(['"]membership_plans['"]\)/);
  });

  it('ProviderMembershipCard migrated to subscription + usage wrappers', () => {
    const src = read('src/components/dashboard/ProviderMembershipCard.tsx');
    expect(src).toContain('getCurrentMembershipSubscription');
    expect(src).toContain('getMembershipUsage');
    expect(src).not.toMatch(/\.from\(['"]membership_subscriptions['"]\)/);
    expect(src).not.toMatch(/supabase\.rpc\(['"]get_membership_usage['"]/);
  });

  it('dashboard/overview/shared MembershipWidget migrated', () => {
    const src = read('src/components/dashboard/overview/shared.tsx');
    expect(src).toContain('getCurrentMembershipSubscription');
    expect(src).not.toMatch(/\.from\(['"]membership_subscriptions['"]\)/);
  });

  it('Membership page migrated reads only; lifecycle RPCs remain direct', () => {
    const src = read('src/pages/Membership.tsx');
    expect(src).toContain('listActiveMembershipPlans');
    expect(src).toContain('getCurrentMembershipSubscription');
    expect(src).not.toMatch(/\.from\(['"]membership_subscriptions['"]\)/);
    expect(src).not.toMatch(/\.from\(['"]membership_plans['"]\)/);
    // Lifecycle RPCs intentionally deferred to MEMB-3.
    expect(src).toMatch(/supabase\.rpc\(['"]subscribe_to_plan['"]/);
    expect(src).toMatch(/supabase\.rpc\(['"]cancel_subscription_at_period_end['"]/);
    expect(src).toMatch(/supabase\.rpc\(['"]resume_subscription_renewal['"]/);
    // Upgrade requests intentionally deferred.
    expect(src).toMatch(/\.from\(['"]membership_upgrade_requests['"]\)/);
  });

  it('MembershipUsageWarning migrated', () => {
    const src = read('src/components/membership/MembershipUsageWarning.tsx');
    expect(src).toContain('getMembershipUsage');
    expect(src).not.toMatch(/supabase\.rpc\(['"]get_membership_usage['"]/);
  });

  it('AdminUpgradeRequestsPanel direct access remains deferred to MEMB-4', () => {
    const src = read('src/components/membership/AdminUpgradeRequestsPanel.tsx');
    expect(src).toMatch(/\.from\(['"]membership_upgrade_requests['"]\)/);
  });

  it('AdminMemberships direct access remains deferred', () => {
    const src = read('src/pages/admin/AdminMemberships.tsx');
    expect(src).toMatch(/\.from\(['"]membership_plans['"]\)/);
  });
});