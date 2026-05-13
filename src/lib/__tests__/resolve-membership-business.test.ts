import { describe, it, expect } from 'vitest';
import {
  resolveMembershipBusiness,
  verifyUpgradeBinding,
  type ResolvableBusiness,
  type StaffCandidate,
} from '@/lib/resolve-membership-business';

const biz = (id: string, ref: string | null, extra: Partial<ResolvableBusiness> = {}): ResolvableBusiness => ({
  id,
  ref_id: ref,
  membership_tier: 'free',
  ...extra,
});

const staff = (
  business_id: string,
  role: string,
  joined: ResolvableBusiness | null,
  is_active = true,
): StaffCandidate => ({ business_id, role, is_active, businesses: joined });

describe('resolveMembershipBusiness', () => {
  it('returns null when both lists are empty', () => {
    expect(resolveMembershipBusiness({ owned: [], staff: [] })).toBeNull();
    expect(resolveMembershipBusiness({})).toBeNull();
  });

  it('prefers an owned business over any staff role', () => {
    const owned = biz('biz-1', 'BIZ-1000001');
    const managed = biz('biz-2', 'BIZ-1000002');
    const result = resolveMembershipBusiness({
      owned: [owned],
      staff: [staff('biz-2', 'manager', managed)],
    });
    expect(result?.id).toBe('biz-1');
    expect(result?.ref_id).toBe('BIZ-1000001');
  });

  it('picks the first owned entry when the user has multiple ownerships', () => {
    const result = resolveMembershipBusiness({
      owned: [biz('biz-newer', 'BIZ-1000010'), biz('biz-older', 'BIZ-1000001')],
    });
    expect(result?.id).toBe('biz-newer');
  });

  it('falls back to staff manager when the user owns nothing', () => {
    const managed = biz('biz-9', 'BIZ-1000099');
    const result = resolveMembershipBusiness({
      owned: [],
      staff: [staff('biz-9', 'manager', managed)],
    });
    expect(result?.id).toBe('biz-9');
    expect(result?.ref_id).toBe('BIZ-1000099');
  });

  it('ignores staff rows with non-eligible roles (e.g. accountant, viewer)', () => {
    const joined = biz('biz-x', 'BIZ-1000050');
    expect(
      resolveMembershipBusiness({ staff: [staff('biz-x', 'accountant', joined)] }),
    ).toBeNull();
    expect(
      resolveMembershipBusiness({ staff: [staff('biz-x', 'viewer', joined)] }),
    ).toBeNull();
  });

  it('ignores inactive staff rows', () => {
    const joined = biz('biz-x', 'BIZ-1000050');
    const result = resolveMembershipBusiness({
      staff: [staff('biz-x', 'manager', joined, false)],
    });
    expect(result).toBeNull();
  });

  it('rejects rows where the join business_id and businesses.id disagree (corrupt link)', () => {
    const wrongJoin = biz('biz-OTHER', 'BIZ-1000099');
    const result = resolveMembershipBusiness({
      staff: [staff('biz-EXPECTED', 'manager', wrongJoin)],
    });
    // The cross-wired row must be skipped — preventing accidental upgrades to
    // someone else's business.
    expect(result).toBeNull();
  });

  it('skips businesses that are missing a ref_id', () => {
    const result = resolveMembershipBusiness({
      owned: [biz('biz-1', null), biz('biz-2', 'BIZ-1000002')],
    });
    expect(result?.id).toBe('biz-2');
  });

  it('returns a business whose id and ref_id are always from the same row', () => {
    const owned = biz('biz-1', 'BIZ-1000001');
    const managed = biz('biz-2', 'BIZ-1000002');
    const result = resolveMembershipBusiness({
      owned: [owned],
      staff: [staff('biz-2', 'owner', managed)],
    });
    // No cross-wiring: must NOT pair biz-1 with BIZ-1000002 or vice-versa.
    expect(result).toEqual(expect.objectContaining({ id: 'biz-1', ref_id: 'BIZ-1000001' }));
  });
});

describe('verifyUpgradeBinding', () => {
  const candidates: ResolvableBusiness[] = [
    biz('biz-1', 'BIZ-1000001'),
    biz('biz-2', 'BIZ-1000002'),
  ];

  it('accepts a payload where id and ref match the same row', () => {
    expect(
      verifyUpgradeBinding({ business_id: 'biz-1', business_ref_id: 'BIZ-1000001' }, candidates),
    ).toEqual({ ok: true });
  });

  it('rejects a payload missing the ref id', () => {
    expect(
      verifyUpgradeBinding({ business_id: 'biz-1', business_ref_id: null }, candidates),
    ).toEqual({ ok: false, reason: 'missing-ref' });
    expect(
      verifyUpgradeBinding({ business_id: 'biz-1', business_ref_id: '' }, candidates),
    ).toEqual({ ok: false, reason: 'missing-ref' });
  });

  it('rejects a payload referencing an unknown business', () => {
    expect(
      verifyUpgradeBinding({ business_id: 'biz-OTHER', business_ref_id: 'BIZ-9999999' }, candidates),
    ).toEqual({ ok: false, reason: 'unknown-business' });
  });

  it('rejects cross-wiring: correct id but ref_id from a sibling business', () => {
    expect(
      verifyUpgradeBinding({ business_id: 'biz-1', business_ref_id: 'BIZ-1000002' }, candidates),
    ).toEqual({ ok: false, reason: 'ref-mismatch' });
  });
});