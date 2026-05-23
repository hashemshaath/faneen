import { describe, it, expect } from 'vitest';
import { maskEmail } from '@/lib/masking';
import { MEMBERSHIP_LIFECYCLE_TEMPLATES } from '@/components/admin/MembershipLifecycleJobsPanel';

describe('R4F-7 MembershipLifecycleJobsPanel — source guards', () => {
  it('tracks all 8 membership lifecycle templates', () => {
    const expected = [
      'membership-subscription-expired',
      'membership-renewal-failed',
      'membership-renewal-reminder',
      'membership-promo-redeemed',
      'membership-subscription-activated',
      'membership-tier-changed-by-admin',
      'membership-cancelled-immediately',
      'membership-subscription-cancelled',
    ];
    expect([...MEMBERSHIP_LIFECYCLE_TEMPLATES].sort()).toEqual(expected.sort());
  });

  it('masks recipient emails before display', () => {
    const masked = maskEmail('owner@example.com');
    expect(masked).not.toContain('owner@example.com');
    expect(masked).toContain('@');
  });

  it('returns em-dash for empty recipient', () => {
    expect(maskEmail(null)).toBe('—');
    expect(maskEmail(undefined)).toBe('—');
  });
});