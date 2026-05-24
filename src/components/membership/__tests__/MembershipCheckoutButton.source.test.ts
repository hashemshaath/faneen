import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * R4F-9C: Source-level guarantees for the user-facing Moyasar checkout
 * entry. Pure string/structure checks — no DOM rendering.
 */

const BUTTON = readFileSync(
  resolve('src/components/membership/MembershipCheckoutButton.tsx'),
  'utf8',
);
const STATUS = readFileSync(
  resolve('src/components/membership/MembershipPaymentStatus.tsx'),
  'utf8',
);

describe('MembershipCheckoutButton — service boundary', () => {
  it('uses the canonical createMembershipPaymentIntent wrapper from memberships module', () => {
    expect(BUTTON).toMatch(/from '@\/modules\/memberships'/);
    expect(BUTTON).toContain('createMembershipPaymentIntent');
  });

  it('does NOT call supabase.functions.invoke directly', () => {
    expect(BUTTON).not.toMatch(/functions\.invoke\(/);
  });

  it('does NOT import the supabase client', () => {
    expect(BUTTON).not.toMatch(/@\/integrations\/supabase\/client/);
  });

  it('does NOT call Moyasar (or any payment provider) directly from the browser', () => {
    expect(BUTTON).not.toMatch(/api\.moyasar\.com/);
    expect(BUTTON).not.toMatch(/MOYASAR_SECRET_KEY/);
    expect(BUTTON).not.toMatch(/Authorization:\s*['"`]Basic/i);
  });

  it('does NOT access tables / rpc directly', () => {
    expect(BUTTON).not.toMatch(/from\(['"]membership_payment_intents['"]\)/);
    expect(BUTTON).not.toMatch(/\.rpc\(/);
  });

  it('does NOT activate the subscription on the client', () => {
    expect(BUTTON).not.toMatch(/membership_subscriptions/);
    expect(BUTTON).not.toMatch(/sendTransactionalEmail/);
    expect(BUTTON).not.toMatch(/createNotification/);
  });

  it('ships both Arabic and English checkout copy', () => {
    expect(BUTTON).toContain('المتابعة للدفع');
    expect(BUTTON).toContain('Continue to payment');
  });

  it('redirects only via the server-returned checkout_url', () => {
    expect(BUTTON).toContain('window.location.href = resp.checkout_url');
    // No URL is hardcoded toward Moyasar.
    expect(BUTTON).not.toMatch(/moyasar\.com/);
  });
});

describe('MembershipPaymentStatus — checkout entry wiring', () => {
  it('renders the MembershipCheckoutButton only for pending intents', () => {
    expect(STATUS).toContain('MembershipCheckoutButton');
    // The button must live inside the created / requires_action branch.
    const idx = STATUS.lastIndexOf('<MembershipCheckoutButton');
    const branchIdx = STATUS.indexOf("status === 'created'");
    expect(branchIdx).toBeGreaterThan(-1);
    expect(idx).toBeGreaterThan(branchIdx);
  });
});