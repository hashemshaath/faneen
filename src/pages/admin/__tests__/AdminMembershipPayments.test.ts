import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const SRC = fs.readFileSync(
  path.resolve(__dirname, '../AdminMembershipPayments.tsx'),
  'utf8',
);

describe('AdminMembershipPayments source contract', () => {
  it('imports listMembershipPaymentIntents from canonical module', () => {
    expect(SRC).toMatch(/listMembershipPaymentIntents/);
    expect(SRC).toMatch(/from ['"]@\/modules\/memberships['"]/);
  });

  it('imports markMembershipPaidManually from canonical module', () => {
    expect(SRC).toMatch(/markMembershipPaidManually/);
  });

  it('does not directly access membership_payment_intents table', () => {
    expect(SRC).not.toMatch(/from\(\s*['"]membership_payment_intents['"]/);
  });

  it('does not directly access membership_payment_webhook_events table', () => {
    expect(SRC).not.toMatch(/from\(\s*['"]membership_payment_webhook_events['"]/);
  });

  it('does not directly invoke admin_mark_membership_paid_manually RPC', () => {
    expect(SRC).not.toMatch(/rpc\(\s*['"]admin_mark_membership_paid_manually['"]/);
  });

  it('does not send transactional emails or notifications directly', () => {
    expect(SRC).not.toMatch(/sendTransactionalEmail/);
    expect(SRC).not.toMatch(/createNotification/);
    expect(SRC).not.toMatch(/from\(\s*['"]notifications['"]/);
  });

  it('mark-paid form includes external payment id, invoice id, paid at, notes', () => {
    expect(SRC).toMatch(/External payment ID/);
    expect(SRC).toMatch(/Invoice ID/);
    expect(SRC).toMatch(/Paid at/);
    expect(SRC).toMatch(/Notes/);
  });

  it('disables mark-paid for already-paid statuses', () => {
    expect(SRC).toMatch(/PAID_STATUSES/);
    expect(SRC).toMatch(/succeeded/);
  });

  it('handles idempotent and error result codes', () => {
    expect(SRC).toMatch(/idempotent/);
    expect(SRC).toMatch(/payment_intent_not_found/);
    expect(SRC).toMatch(/duplicate_payment_reference/);
  });

  it('refetches list after success via invalidateQueries', () => {
    expect(SRC).toMatch(/invalidateQueries/);
  });
});

describe('AdminMembershipPayments route wiring', () => {
  const APP = fs.readFileSync(path.resolve(__dirname, '../../../App.tsx'), 'utf8');
  it('is registered as admin-only route at /admin/membership-payments', () => {
    expect(APP).toMatch(/\/admin\/membership-payments/);
    expect(APP).toMatch(/AdminMembershipPayments/);
    expect(APP).toMatch(/requireAdmin[^>]*>\s*<AdminMembershipPayments/);
  });
});

describe('AdminMembershipPayments query-param deep link (R4F-8F)', () => {
  it('reads "intent" search param via react-router useSearchParams', () => {
    expect(SRC).toMatch(/useSearchParams/);
    expect(SRC).toMatch(/searchParams\.get\(['"]intent['"]\)/);
  });

  it('opening with intent param is read-only (no auto mark-paid)', () => {
    // markMembershipPaidManually must only be invoked from handleSubmit.
    const calls = SRC.match(/markMembershipPaidManually\(/g) || [];
    expect(calls.length).toBe(1);
    // Highlight effect uses bg class, not a mutation.
    expect(SRC).toMatch(/isHighlighted/);
    expect(SRC).not.toMatch(/useEffect[^}]*markMembershipPaidManually/);
  });
});

describe('Admin sidebar nav entry (R4F-8F)', () => {
  const NAV = fs.readFileSync(
    path.resolve(__dirname, '../../../components/dashboard/DashboardSidebar.tsx'),
    'utf8',
  );
  it('includes /admin/membership-payments link with bilingual labels', () => {
    expect(NAV).toMatch(/\/admin\/membership-payments/);
    expect(NAV).toMatch(/مدفوعات العضويات/);
    expect(NAV).toMatch(/Membership Payments/);
  });

  it('does not directly query payment intents or call mark-paid rpc from nav', () => {
    expect(NAV).not.toMatch(/from\(\s*['"]membership_payment_intents['"]/);
    expect(NAV).not.toMatch(/rpc\(\s*['"]admin_mark_membership_paid_manually['"]/);
  });
});

describe('AdminMembershipPayments webhook events panel (R4F-8G)', () => {
  it('imports listMembershipPaymentWebhookEvents from canonical module', () => {
    expect(SRC).toMatch(/listMembershipPaymentWebhookEvents/);
    expect(SRC).toMatch(/from ['"]@\/modules\/memberships['"]/);
  });

  it('renders bilingual recent payment events panel title', () => {
    expect(SRC).toMatch(/Recent payment events/);
    expect(SRC).toMatch(/أحداث الدفع الأخيرة/);
  });

  it('deep links to payment intent via ?intent= when payload contains payment_intent_id', () => {
    expect(SRC).toMatch(/\/admin\/membership-payments\?intent=/);
  });

  it('does not dump full raw payload JSON or expose sensitive keys', () => {
    expect(SRC).not.toMatch(/JSON\.stringify\(\s*e\.payload/);
    expect(SRC).not.toMatch(/signature/);
    expect(SRC).toMatch(/extractSafePayloadSummary/);
  });

  it('remains read-only: markMembershipPaidManually is still only called once from submit handler', () => {
    const calls = SRC.match(/markMembershipPaidManually\(/g) || [];
    expect(calls.length).toBe(1);
    expect(SRC).not.toMatch(/useEffect[^}]*markMembershipPaidManually/);
  });

  it('shows empty-state copy clarifying no provider integration yet', () => {
    expect(SRC).toMatch(/No payment events yet\./);
    expect(SRC).toMatch(/لا توجد أحداث دفع بعد\./);
  });
});