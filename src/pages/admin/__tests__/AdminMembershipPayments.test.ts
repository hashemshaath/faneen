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

describe('AdminMembershipPayments manual refund (R4F-8H)', () => {
  it('imports markMembershipRefundedManually from canonical module', () => {
    expect(SRC).toMatch(/markMembershipRefundedManually/);
    expect(SRC).toMatch(/from ['"]@\/modules\/memberships['"]/);
  });

  it('UI exposes refund reference, refunded-at, and notes fields', () => {
    expect(SRC).toMatch(/refund-ref/);
    expect(SRC).toMatch(/refunded-at/);
    expect(SRC).toMatch(/refund-notes/);
  });

  it('exposes bilingual "Mark refunded" action button', () => {
    expect(SRC).toMatch(/Mark refunded/);
    expect(SRC).toMatch(/تسجيل استرداد/);
  });

  it('renders refunded badge for refunded rows', () => {
    expect(SRC).toMatch(/Refunded/);
    expect(SRC).toMatch(/مسترد/);
    expect(SRC).toMatch(/REFUNDED_STATUSES/);
  });

  it('refunded rows do not expose mark-paid or mark-refunded actions', () => {
    expect(SRC).toMatch(/isRefunded \?[\s\S]*?:\s*isPaid \?/);
  });

  it('does not directly call supabase rpc or tables from UI for refund', () => {
    expect(SRC).not.toMatch(/supabase\.rpc\(\s*['"]admin_mark_membership_payment_refunded_manually/);
    expect(SRC).not.toMatch(/\.from\(\s*['"]membership_payment_intents['"]/);
  });

  it('refund submit is only invoked from handler (no useEffect auto-submit)', () => {
    const calls = SRC.match(/markMembershipRefundedManually\(/g) || [];
    // Once in import area logic uses identifier elsewhere, but actual invocation is in handler.
    // Guard: at most one call site invokes it.
    const invocations = SRC.match(/markMembershipRefundedManually\(\{/g) || [];
    expect(invocations.length).toBe(1);
    expect(SRC).not.toMatch(/useEffect[^}]*markMembershipRefundedManually/);
    expect(calls.length).toBeGreaterThanOrEqual(1);
  });

  it('refreshes both intents and events lists after refund success', () => {
    expect(SRC).toMatch(/admin-membership-payments/);
    expect(SRC).toMatch(/admin-membership-payment-events/);
  });

  it('refund flow uses correct error codes mapping', () => {
    expect(SRC).toMatch(/payment_not_paid/);
    expect(SRC).toMatch(/Cannot refund a non-paid intent/);
    expect(SRC).toMatch(/تعذر تسجيل الاسترداد/);
  });
});

describe('AdminMembershipPayments live monitoring (R4F-9F)', () => {
  it('imports reconcileMembershipPaymentStatus from canonical module', () => {
    expect(SRC).toMatch(/reconcileMembershipPaymentStatus/);
    expect(SRC).toMatch(/from ['"]@\/modules\/memberships['"]/);
  });

  it('does not call functions.invoke or supabase.from directly', () => {
    expect(SRC).not.toMatch(/functions\.invoke/);
    expect(SRC).not.toMatch(/supabase\.from/);
  });

  it('renders bilingual Reconcile status action', () => {
    expect(SRC).toMatch(/Reconcile status/);
    expect(SRC).toMatch(/مزامنة الحالة/);
  });

  it('renders bilingual Needs follow-up health label for stale pending intents', () => {
    expect(SRC).toMatch(/Needs follow-up/);
    expect(SRC).toMatch(/بحاجة إلى متابعة/);
  });

  it('renders health chips for all required states', () => {
    expect(SRC).toMatch(/Requires action/);
    expect(SRC).toMatch(/Waiting for webhook/);
    expect(SRC).toMatch(/Succeeded/);
    expect(SRC).toMatch(/Failed/);
  });

  it('does not render raw payload (no JSON.stringify of payload, no sensitive keys)', () => {
    expect(SRC).not.toMatch(/JSON\.stringify\(\s*e\.payload/);
    expect(SRC).not.toMatch(/JSON\.stringify\(\s*payload/);
    for (const key of ['signature', 'secret', 'token', 'card', 'number', 'cvc']) {
      const re = new RegExp(`['"\`]${key}['"\`]`, 'i');
      expect(SRC).not.toMatch(re);
    }
  });

  it('maps reconcile error codes', () => {
    expect(SRC).toMatch(/missing_payment_config/);
    expect(SRC).toMatch(/provider_error/);
    expect(SRC).toMatch(/not_found/);
    expect(SRC).toMatch(/status_not_final/);
  });

  it('refreshes both intents and events queries after reconcile', () => {
    // both invalidation keys must appear, and the reconcile handler must invalidate both.
    expect(SRC).toMatch(/handleReconcile/);
    expect(SRC).toMatch(/admin-membership-payments/);
    expect(SRC).toMatch(/admin-membership-payment-events/);
  });

  it('pending events show Pending reconcile / بانتظار المزامنة label', () => {
    expect(SRC).toMatch(/Pending reconcile/);
    expect(SRC).toMatch(/بانتظار المزامنة/);
  });

  it('events panel exposes a filter (All / Pending / Processed / Error)', () => {
    expect(SRC).toMatch(/eventFilter/);
    expect(SRC).toMatch(/Pending/);
    expect(SRC).toMatch(/Processed/);
  });

  it('matched intent deep link remains /admin/membership-payments?intent=', () => {
    expect(SRC).toMatch(/\/admin\/membership-payments\?intent=/);
  });
});