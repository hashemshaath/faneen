import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const read = (p: string) => readFileSync(resolve(p), 'utf8');

describe('MEMB-5 invite/access keys migration', () => {
  it('MembershipKeysManager uses key services and drops direct table/RPC access', () => {
    const src = read('src/components/membership/MembershipKeysManager.tsx');
    expect(src).toContain("from '@/modules/memberships'");
    expect(src).toContain('listMembershipInviteKeys');
    expect(src).toContain('listMembershipAccessKeys');
    expect(src).toContain('generateInviteKey');
    expect(src).toContain('revokeInviteKey');
    expect(src).toContain('createAccessKey');
    expect(src).toContain('revokeAccessKey');
    expect(src).not.toMatch(/\.from\(['"]membership_invite_keys['"]\)/);
    expect(src).not.toMatch(/\.from\(['"]membership_access_keys['"]\)/);
    expect(src).not.toMatch(/supabase\.rpc\(\s*['"]generate_invite_key['"]/);
    expect(src).not.toMatch(/supabase\.rpc\(\s*['"]revoke_invite_key['"]/);
    expect(src).not.toMatch(/supabase\.rpc\(\s*['"]create_access_key['"]/);
    expect(src).not.toMatch(/supabase\.rpc\(\s*['"]revoke_access_key['"]/);
    // Query keys preserved.
    expect(src).toContain("['invite-keys', businessId]");
    expect(src).toContain("['access-keys', businessId]");
  });

  it('MembershipKeyUsageLog uses usage log services', () => {
    const src = read('src/components/membership/MembershipKeyUsageLog.tsx');
    expect(src).toContain('listAccessKeyUsageLog');
    expect(src).toContain('listMembershipInviteRedemptions');
    expect(src).not.toMatch(/\.from\(['"]membership_access_key_usage_log['"]\)/);
    expect(src).not.toMatch(/\.from\(['"]membership_invite_redemptions['"]\)/);
    // Query keys preserved.
    expect(src).toContain("['access-key-usage', businessId]");
    expect(src).toContain("['invite-redemptions', businessId]");
  });

  it('promo codes are migrated in MEMB-6 (no longer deferred)', () => {
    const src = read('src/components/membership/PromoCodeRedeem.tsx');
    expect(src).toContain("from '@/modules/memberships'");
    expect(src).toContain('redeemPromoCode');
  });
});