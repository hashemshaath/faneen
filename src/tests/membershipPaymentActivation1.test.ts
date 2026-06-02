/**
 * MEMBERSHIP-PAYMENT-ACTIVATION-1 — regression contract
 *
 * Static + behavioral guards covering the payment → active subscription
 * → tier mirror pipeline.
 *
 * 1. Pure billing-cycle period math (no DB).
 * 2. Source-code guards on the shared edge helper so the activation
 *    path can never silently regress to "payment mirror only".
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { computeMembershipPeriodEnd } from '@/lib/membership/computePeriodEnd';

describe('computeMembershipPeriodEnd — billing cycle math', () => {
  const start = new Date('2026-06-02T10:00:00.000Z');

  it('monthly cycle adds 1 month from startAt on first activation', () => {
    const end = computeMembershipPeriodEnd({
      billingCycle: 'monthly',
      startAt: start,
      currentExpiresAt: null,
    });
    expect(end?.toISOString()).toBe('2026-07-02T10:00:00.000Z');
  });

  it('yearly cycle adds 1 year from startAt', () => {
    const end = computeMembershipPeriodEnd({
      billingCycle: 'yearly',
      startAt: start,
      currentExpiresAt: null,
    });
    expect(end?.toISOString()).toBe('2027-06-02T10:00:00.000Z');
  });

  it('"annual" alias matches yearly', () => {
    const end = computeMembershipPeriodEnd({
      billingCycle: 'annual',
      startAt: start,
      currentExpiresAt: null,
    });
    expect(end?.toISOString()).toBe('2027-06-02T10:00:00.000Z');
  });

  it('renewal extends from current expiry when still in the future', () => {
    const now = new Date('2026-06-02T10:00:00.000Z');
    const currentExpires = new Date('2026-06-20T10:00:00.000Z');
    const end = computeMembershipPeriodEnd({
      billingCycle: 'monthly',
      startAt: now,
      currentExpiresAt: currentExpires,
      now,
    });
    expect(end?.toISOString()).toBe('2026-07-20T10:00:00.000Z');
  });

  it('expired subscription anchors new period at startAt, not stale expiry', () => {
    const now = new Date('2026-06-02T10:00:00.000Z');
    const staleExpires = new Date('2026-01-01T10:00:00.000Z');
    const end = computeMembershipPeriodEnd({
      billingCycle: 'monthly',
      startAt: now,
      currentExpiresAt: staleExpires,
      now,
    });
    expect(end?.toISOString()).toBe('2026-07-02T10:00:00.000Z');
  });

  it('unknown / missing billing cycle returns null so caller preserves expiry', () => {
    expect(
      computeMembershipPeriodEnd({ billingCycle: '', startAt: start }),
    ).toBeNull();
    expect(
      computeMembershipPeriodEnd({ billingCycle: null, startAt: start }),
    ).toBeNull();
    expect(
      computeMembershipPeriodEnd({ billingCycle: 'lifetime', startAt: start }),
    ).toBeNull();
  });
});

describe('shared edge helper — activation wiring guard', () => {
  const source = readFileSync(
    join(
      process.cwd(),
      'supabase',
      'functions',
      '_shared',
      'membership-payments',
      'index.ts',
    ),
    'utf8',
  );

  it('exports computeMembershipPeriodEnd', () => {
    expect(source).toMatch(/export function computeMembershipPeriodEnd/);
  });

  it('defines the activation helper called from reconcile', () => {
    expect(source).toMatch(/async function activateSubscriptionOnPaymentSuccess/);
    expect(source).toMatch(/activateSubscriptionOnPaymentSuccess\(\{/);
  });

  it("activation sets status='active' on the subscription row", () => {
    expect(source).toMatch(/status:\s*'active'/);
  });

  it('activation clears cancelled_at and grace_period_until', () => {
    expect(source).toMatch(/cancelled_at:\s*null/);
    expect(source).toMatch(/grace_period_until:\s*null/);
  });

  it('activation guards against inactive plans (no auto-activation)', () => {
    expect(source).toMatch(/plan_inactive/);
    expect(source).toMatch(/is_active/);
  });

  it('activation never writes the businesses or profiles tier mirrors directly', () => {
    // Trigger trg_membership_subscriptions_sync_tier owns those mirrors.
    expect(source).not.toMatch(/from\(['"]businesses['"]\)[\s\S]{0,200}membership_tier/);
    expect(source).not.toMatch(/from\(['"]profiles['"]\)[\s\S]{0,200}membership_tier/);
  });
});