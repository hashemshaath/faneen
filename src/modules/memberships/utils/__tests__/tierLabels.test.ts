import { describe, it, expect } from 'vitest';
import {
  getMembershipTierLabel,
  getMembershipTierBadgeVariant,
  getUpgradePath,
  compareMembershipTiers,
  isTierAtLeast,
} from '../tierLabels';

describe('membership tier labels', () => {
  it('returns Arabic labels by default', () => {
    expect(getMembershipTierLabel('free')).toBe('مجاني');
    expect(getMembershipTierLabel('basic')).toBe('أساسي');
    expect(getMembershipTierLabel('premium')).toBe('مميز');
    expect(getMembershipTierLabel('enterprise')).toBe('مؤسسي');
  });

  it('returns English labels when requested', () => {
    expect(getMembershipTierLabel('free', 'en')).toBe('Free');
    expect(getMembershipTierLabel('basic', 'en')).toBe('Basic');
    expect(getMembershipTierLabel('premium', 'en')).toBe('Premium');
    expect(getMembershipTierLabel('enterprise', 'en')).toBe('Enterprise');
  });

  it('falls back to raw token for unknown tiers', () => {
    expect(getMembershipTierLabel('mystery' as never)).toBe('mystery');
  });

  it('returns empty string for nullish input', () => {
    expect(getMembershipTierLabel(null)).toBe('');
    expect(getMembershipTierLabel(undefined)).toBe('');
  });

  it('maps tier to badge variant', () => {
    expect(getMembershipTierBadgeVariant('free')).toBe('outline');
    expect(getMembershipTierBadgeVariant('basic')).toBe('secondary');
    expect(getMembershipTierBadgeVariant('premium')).toBe('default');
    expect(getMembershipTierBadgeVariant('enterprise')).toBe('default');
    expect(getMembershipTierBadgeVariant(null)).toBe('outline');
  });

  it('exposes the canonical upgrade path', () => {
    expect(getUpgradePath()).toBe('/membership');
  });
});

describe('membership tier comparison', () => {
  it('orders tiers free < basic < premium < enterprise', () => {
    expect(compareMembershipTiers('free', 'basic')).toBeLessThan(0);
    expect(compareMembershipTiers('basic', 'premium')).toBeLessThan(0);
    expect(compareMembershipTiers('premium', 'enterprise')).toBeLessThan(0);
    expect(compareMembershipTiers('enterprise', 'free')).toBeGreaterThan(0);
    expect(compareMembershipTiers('premium', 'premium')).toBe(0);
  });

  it('treats unknown tiers as the lowest rank', () => {
    expect(compareMembershipTiers('bogus' as never, 'free')).toBeLessThan(0);
    expect(compareMembershipTiers(null, 'free')).toBeLessThan(0);
  });

  it('isTierAtLeast respects ordering', () => {
    expect(isTierAtLeast('premium', 'basic')).toBe(true);
    expect(isTierAtLeast('basic', 'premium')).toBe(false);
    expect(isTierAtLeast('enterprise', 'enterprise')).toBe(true);
    expect(isTierAtLeast(null, 'free')).toBe(false);
  });
});
