import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * R4F-8I: Source-level guarantees for the user-facing payment status
 * panel. Pure string/structure checks — no DOM rendering.
 */

const COMPONENT = readFileSync(
  resolve('src/components/membership/MembershipPaymentStatus.tsx'),
  'utf8',
);
const PAGE = readFileSync(resolve('src/pages/Membership.tsx'), 'utf8');

describe('MembershipPaymentStatus — service boundary', () => {
  it('imports from the canonical memberships module barrel', () => {
    expect(COMPONENT).toMatch(
      /from '@\/modules\/memberships'/,
    );
    expect(COMPONENT).toContain('getLatestMembershipPaymentIntentForSubscription');
  });

  it('does NOT access supabase tables or RPCs directly', () => {
    expect(COMPONENT).not.toMatch(/from\(['"]membership_payment_intents['"]\)/);
    expect(COMPONENT).not.toMatch(/from\(['"]membership_payment_webhook_events['"]\)/);
    expect(COMPONENT).not.toMatch(/\.rpc\(/);
    expect(COMPONENT).not.toMatch(/@\/integrations\/supabase\/client/);
  });

  it('does NOT expose webhook payload or sensitive provider identifiers', () => {
    expect(COMPONENT).not.toMatch(/provider_intent_id/);
    expect(COMPONENT).not.toMatch(/receipt_url/);
    expect(COMPONENT).not.toMatch(/JSON\.stringify/);
    expect(COMPONENT).not.toMatch(/processing_error/);
    // No webhook `payload` field is referenced as data.
    expect(COMPONENT).not.toMatch(/\.payload\b/);
    expect(COMPONENT).not.toMatch(/['"]payload['"]/);
    // No admin-only manual_mark_paid notes surface.
    expect(COMPONENT).not.toMatch(/manual_mark_paid/);
  });

  it('does NOT include any user-triggered refund action', () => {
    expect(COMPONENT).not.toMatch(/markMembershipRefundedManually/);
    expect(COMPONENT).not.toMatch(/markMembershipPaidManually/);
    expect(COMPONENT).not.toMatch(/admin_mark_membership/);
  });
});

describe('MembershipPaymentStatus — bilingual copy', () => {
  it('contains paid / refunded / pending / failed labels in both languages', () => {
    // Paid
    expect(COMPONENT).toContain('مدفوع');
    expect(COMPONENT).toContain("'Paid'");
    // Refunded
    expect(COMPONENT).toContain('مسترد');
    expect(COMPONENT).toContain("'Refunded'");
    // Pending
    expect(COMPONENT).toContain('قيد الانتظار');
    expect(COMPONENT).toContain("'Pending'");
    // Failed
    expect(COMPONENT).toContain('فشل');
    expect(COMPONENT).toContain("'Failed'");
  });

  it('shows the manual-refund badge copy in both languages', () => {
    expect(COMPONENT).toContain('تم تسجيل الاسترداد يدويًا');
    expect(COMPONENT).toContain('Refund marked manually');
  });

  it('shows the clarifying refund disclosure in both languages', () => {
    expect(COMPONENT).toContain(
      'قد تتم معالجة الاسترداد الفعلي خارج المنصة حسب طريقة الدفع.',
    );
    expect(COMPONENT).toContain(
      'The actual refund may be processed outside the platform depending on the payment method.',
    );
  });

  it('surfaces confirmed_at + invoice_id for paid intents', () => {
    expect(COMPONENT).toContain('confirmed_at');
    expect(COMPONENT).toContain('invoice_id');
  });
});

describe('Membership page mounts MembershipPaymentStatus', () => {
  it('imports and renders the panel with subscriptionId', () => {
    expect(PAGE).toContain(
      "import { MembershipPaymentStatus } from '@/components/membership/MembershipPaymentStatus'",
    );
    expect(PAGE).toContain('<MembershipPaymentStatus');
    expect(PAGE).toMatch(/subscriptionId=\{/);
  });
});