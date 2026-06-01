import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * R4F-8J: Source-level guarantees for the user-facing payment history
 * list. Pure string/structure checks — no DOM rendering.
 */

const COMPONENT = readFileSync(
  resolve('src/components/membership/MembershipPaymentHistory.tsx'),
  'utf8',
);
const PAGE = readFileSync(resolve('src/pages/Membership.tsx'), 'utf8');

describe('MembershipPaymentHistory — service boundary', () => {
  it('imports from the canonical memberships module barrel', () => {
    expect(COMPONENT).toMatch(/from ['"]@\/modules\/memberships['"]/);
    expect(COMPONENT).toContain('listMembershipPaymentIntentsForSubscription');
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
    expect(COMPONENT).not.toMatch(/idempotency_key/);
    expect(COMPONENT).not.toMatch(/\.payload\b/);
    expect(COMPONENT).not.toMatch(/['"]payload['"]/);
    expect(COMPONENT).not.toMatch(/manual_mark_paid/);
  });

  it('does NOT include any user-triggered payment/refund action', () => {
    expect(COMPONENT).not.toMatch(/markMembershipRefundedManually/);
    expect(COMPONENT).not.toMatch(/markMembershipPaidManually/);
    expect(COMPONENT).not.toMatch(/admin_mark_membership/);
  });

  it('only extracts metadata.manual_refund.refunded_at for refunded timestamp', () => {
    expect(COMPONENT).toMatch(/manual_refund/);
    expect(COMPONENT).toMatch(/refunded_at/);
  });
});

describe('MembershipPaymentHistory — bilingual copy', () => {
  it('contains the title in both languages', () => {
    expect(COMPONENT).toContain('سجل المدفوعات');
    expect(COMPONENT).toContain("'Payment history'");
  });

  it('contains the empty state in both languages', () => {
    expect(COMPONENT).toContain('لا يوجد سجل مدفوعات بعد.');
    expect(COMPONENT).toContain('No payment history yet.');
  });

  it('contains paid / refunded / pending / failed labels in both languages', () => {
    expect(COMPONENT).toContain('مدفوع');
    expect(COMPONENT).toContain("'Paid'");
    expect(COMPONENT).toContain('مسترد');
    expect(COMPONENT).toContain("'Refunded'");
    expect(COMPONENT).toContain('قيد الانتظار');
    expect(COMPONENT).toContain("'Pending'");
    expect(COMPONENT).toContain('فشل');
    expect(COMPONENT).toContain("'Failed'");
  });

  it('contains invoice and amount labels in both languages', () => {
    expect(COMPONENT).toContain('المبلغ');
    expect(COMPONENT).toContain("'Amount: '");
    expect(COMPONENT).toContain('الفاتورة');
    expect(COMPONENT).toContain("'Invoice: '");
    expect(COMPONENT).toContain('التاريخ');
    expect(COMPONENT).toContain("'Date: '");
  });
});

describe('Membership page mounts MembershipPaymentHistory', () => {
  it('imports and renders the history component with subscriptionId', () => {
    // The component is loaded via lazyRetry (project standard) — assert either
    // the eager named import or the canonical lazyRetry dynamic import.
    const hasEagerImport = PAGE.includes(
      "import { MembershipPaymentHistory } from '@/components/membership/MembershipPaymentHistory'",
    );
    const hasLazyImport =
      /lazyRetry\(\(\)\s*=>\s*import\(['"]@\/components\/membership\/MembershipPaymentHistory['"]\)/.test(
        PAGE,
      ) && /MembershipPaymentHistory/.test(PAGE);
    expect(hasEagerImport || hasLazyImport).toBe(true);
    expect(PAGE).toContain('<MembershipPaymentHistory');
    expect(PAGE).toMatch(/subscriptionId=\{/);
  });
});
