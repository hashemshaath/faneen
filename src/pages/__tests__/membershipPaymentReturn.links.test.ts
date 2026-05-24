import { describe, it, expect } from 'vitest';

/**
 * FIX-BROKEN-MEMBERSHIP-LINK-1: Verify MembershipPaymentReturn.tsx
 * does not reference the non-existent /dashboard/membership route.
 */
describe('MembershipPaymentReturn link integrity', () => {
  it('must not reference the broken /dashboard/membership route', async () => {
    const module = await import('../MembershipPaymentReturn.tsx?raw');
    const source = String((module as unknown as { default: string }).default);
    expect(source).not.toContain('/dashboard/membership');
  });

  it('must reference the canonical /membership route', async () => {
    const module = await import('../MembershipPaymentReturn.tsx?raw');
    const source = String((module as unknown as { default: string }).default);
    expect(source).toContain('to="/membership"');
  });

  it('must reference the existing /dashboard route for the Dashboard button', async () => {
    const module = await import('../MembershipPaymentReturn.tsx?raw');
    const source = String((module as unknown as { default: string }).default);
    expect(source).toContain('to="/dashboard"');
  });
});

describe('Membership payment service link integrity', () => {
  it('manualMarkPaid must not reference /dashboard/membership', async () => {
    const module = await import(
      '../../modules/memberships/services/payments/manualMarkPaid.ts?raw'
    );
    const source = String((module as unknown as { default: string }).default);
    expect(source).not.toContain('/dashboard/membership');
  });

  it('manualMarkRefunded must not reference /dashboard/membership', async () => {
    const module = await import(
      '../../modules/memberships/services/payments/manualMarkRefunded.ts?raw'
    );
    const source = String((module as unknown as { default: string }).default);
    expect(source).not.toContain('/dashboard/membership');
  });
});
