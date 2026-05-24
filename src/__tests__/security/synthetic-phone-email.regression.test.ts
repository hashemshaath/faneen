import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * AUTH-EMAIL-PHONE-VERIFY-2 regression guard.
 *
 * Ensures user-facing surfaces never display the synthetic phone-login
 * auth email (`@phone.qitaat.local`) as the user's official email, and
 * that transactional email senders gate on the centralized helper so
 * synthetic addresses are never used as a delivery recipient.
 */

const read = (p: string) => readFileSync(resolve(process.cwd(), p), 'utf8');

const SYNTHETIC_LITERAL = /@phone\.qitaat\.local/;

const USER_FACING_FILES = [
  'src/pages/MembershipInvoice.tsx',
  'src/pages/Membership.tsx',
  'src/pages/dashboard/DashboardSettings.tsx',
  'src/pages/admin/AdminUsers.tsx',
  'src/pages/admin/AdminMemberships.tsx',
  'src/components/membership/MembershipPaymentHistory.tsx',
];

describe('synthetic phone-login email is never rendered as official email', () => {
  for (const file of USER_FACING_FILES) {
    it(`${file} contains no hardcoded synthetic-domain literal`, () => {
      expect(read(file)).not.toMatch(SYNTHETIC_LITERAL);
    });
  }
});

describe('Membership.tsx routes outbound email through the delivery-address helper', () => {
  const src = read('src/pages/Membership.tsx');
  it('imports getEmailDeliveryAddress', () => {
    expect(src).toMatch(/getEmailDeliveryAddress/);
    expect(src).toMatch(/from '@\/lib\/auth-email'/);
  });
  it('does not pass user.email straight into sendTransactionalEmail', () => {
    // Allow `recipientEmail: <var>` (deliveryEmail / upgradeDeliveryEmail / cancelDeliveryEmail)
    // but forbid the previous `recipientEmail: user.email` shape.
    expect(src).not.toMatch(/recipientEmail:\s*user\.email/);
  });
  it('logs the standardized missing_official_email reason when suppressed', () => {
    expect(src).toMatch(/missing_official_email|MISSING_OFFICIAL_EMAIL_REASON/);
  });
});

describe('DashboardSettings.tsx hides synthetic auth email from official surfaces', () => {
  const src = read('src/pages/dashboard/DashboardSettings.tsx');
  it('imports the auth-email helper', () => {
    expect(src).toMatch(/from '@\/lib\/auth-email'/);
  });
  it('uses isSyntheticPhoneEmail to gate login identifier display', () => {
    expect(src).toMatch(/isSyntheticPhoneEmail\(/);
  });
  it('uses getDisplayEmail for the profile-card email row', () => {
    expect(src).toMatch(/getDisplayEmail\(/);
  });
});
