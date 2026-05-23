import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const read = (p: string) => readFileSync(resolve(p), 'utf8');

describe('MEMB-7 admin + provider legacy migration', () => {
  it('AdminMemberships uses admin plan/sub/usage services and drops direct table/RPC', () => {
    const src = read('src/pages/admin/AdminMemberships.tsx');
    expect(src).toContain('listAdminMembershipPlans');
    expect(src).toContain('listAdminMembershipSubscriptions');
    expect(src).toContain('adminListMembershipUsage');
    expect(src).toContain('insertMembershipPlan');
    expect(src).toContain('updateMembershipPlanById');
    expect(src).not.toMatch(/\.from\(['"]membership_plans['"]\)/);
    expect(src).not.toMatch(/\.from\(['"]membership_subscriptions['"]\)/);
    expect(src).not.toMatch(/supabase\.rpc\(\s*['"]admin_list_membership_usage['"]/);
    // MEMB-3 lifecycle wrappers remain in use.
    expect(src).toContain('cancelSubscription');
    expect(src).toContain('adminUpgradeSubscription');
    expect(src).toContain('subscribeToPlan');
    // Query keys preserved.
    expect(src).toContain("['admin-membership-plans']");
    expect(src).toContain("['admin-subscriptions']");
  });

  it('AdminDashboardView uses countActiveMembershipSubscriptions', () => {
    const src = read('src/pages/dashboard/overview/AdminDashboardView.tsx');
    expect(src).toContain('countActiveMembershipSubscriptions');
    expect(src).not.toMatch(/\.from\(['"]membership_subscriptions['"]\)/);
  });

  it('AdminProviderSubscriptions uses provider legacy services and drops direct table/RPC', () => {
    const src = read('src/pages/admin/AdminProviderSubscriptions.tsx');
    expect(src).toContain('listProviderPlans');
    expect(src).toContain('listProviderSubscriptions');
    expect(src).toContain('updateProviderSubscriptionById');
    expect(src).toContain('adminAdjustProviderCredits');
    expect(src).not.toMatch(/\.from\(['"]provider_plans['"]\)/);
    expect(src).not.toMatch(/\.from\(['"]provider_subscriptions['"]\)/);
    expect(src).not.toMatch(/supabase\.rpc\(\s*['"]admin_adjust_provider_credits['"]/);
    // Query keys preserved.
    expect(src).toContain("['admin-plans']");
    expect(src).toContain("['admin-subs']");
    // provider_lead_credit_transactions migrated to credits module in CRED-2.
    expect(src).not.toMatch(/\.from\(['"]provider_lead_credit_transactions['"]\)/);
    expect(src).toContain('listProviderCreditTransactionsForBusiness');
  });

  it('ProviderMembership uses listProviderSubscriptionsForCurrentUser', () => {
    const src = read('src/pages/dashboard/ProviderMembership.tsx');
    expect(src).toContain('listProviderSubscriptionsForCurrentUser');
    expect(src).not.toMatch(/\.from\(['"]provider_subscriptions['"]\)/);
    expect(src).toContain("['provider-subscription', user?.id]");
  });

  it('AdminQuoteRequestDetails uses getProviderSubscriptionForBusiness', () => {
    const src = read('src/pages/admin/AdminQuoteRequestDetails.tsx');
    expect(src).toContain('getProviderSubscriptionForBusiness');
    expect(src).not.toMatch(/\.from\(['"]provider_subscriptions['"]\)/);
    expect(src).toContain("['reveal-sub', revealProviderBizId]");
  });

  it('previous MEMB-2..6 migrations remain intact', () => {
    const promo = read('src/components/membership/AdminPromoCodesPanel.tsx');
    const redeem = read('src/components/membership/PromoCodeRedeem.tsx');
    const keys = read('src/components/membership/MembershipKeysManager.tsx');
    expect(promo).toContain('listMembershipPromoCodes');
    expect(redeem).toContain('redeemPromoCode');
    expect(keys).toContain('listMembershipInviteKeys');
  });
});