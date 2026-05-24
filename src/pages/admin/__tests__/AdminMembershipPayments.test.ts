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