import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const read = (p: string) => readFileSync(resolve(p), 'utf8');

describe('MEMB-6 promo codes migration', () => {
  it('AdminPromoCodesPanel uses promo code read services and drops direct table access', () => {
    const src = read('src/components/membership/AdminPromoCodesPanel.tsx');
    expect(src).toContain("from '@/modules/memberships'");
    expect(src).toContain('listMembershipPromoCodes');
    expect(src).toContain('listMembershipPromoCodeAttempts');
    expect(src).not.toMatch(/\.from\(['"]membership_promo_codes['"]\)/);
    expect(src).not.toMatch(/\.from\(['"]membership_promo_code_attempts['"]\)/);
    expect(src).not.toMatch(/from\s+['"]@\/integrations\/supabase\/client['"]/);
    // Query keys preserved.
    expect(src).toContain("['admin-promo-codes']");
    expect(src).toContain("['admin-promo-attempts']");
  });

  it('PromoCodeRedeem uses redeemPromoCode service and drops direct RPC', () => {
    const src = read('src/components/membership/PromoCodeRedeem.tsx');
    expect(src).toContain("from '@/modules/memberships'");
    expect(src).toContain('redeemPromoCode');
    expect(src).not.toMatch(/supabase\.rpc\(\s*['"]redeem_promo_code['"]/);
    expect(src).not.toMatch(/from\s+['"]@\/integrations\/supabase\/client['"]/);
    // Behavior/invalidation preserved.
    expect(src).toContain("['my-subscription']");
    expect(src).toContain("['my-business-membership']");
    expect(src).toContain("code.trim().toUpperCase()");
  });

  it('provider_plans/provider_subscriptions remain deferred to MEMB-7', () => {
    // Sanity: this migration touched only promo code paths.
    const src = read('src/components/membership/PromoCodeRedeem.tsx');
    expect(src).not.toContain('provider_plans');
    expect(src).not.toContain('provider_subscriptions');
  });
});