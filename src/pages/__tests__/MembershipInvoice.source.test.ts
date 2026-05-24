import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * R4F-8K: Source-level contract for the printable invoice / credit-note page.
 * No DOM rendering — pure structural checks.
 */

const SRC = readFileSync(resolve('src/pages/MembershipInvoice.tsx'), 'utf8');
const APP = readFileSync(resolve('src/App.tsx'), 'utf8');
const HISTORY = readFileSync(
  resolve('src/components/membership/MembershipPaymentHistory.tsx'),
  'utf8',
);
const ADMIN = readFileSync(resolve('src/pages/admin/AdminMembershipPayments.tsx'), 'utf8');

describe('MembershipInvoice — service boundary', () => {
  it('uses the canonical service wrapper only', () => {
    expect(SRC).toMatch(/from ['"]@\/modules\/memberships['"]/);
    expect(SRC).toContain('getMembershipPaymentIntentForInvoice');
  });

  it('does NOT access supabase tables or RPCs directly', () => {
    expect(SRC).not.toMatch(/from\(['"]membership_payment_intents['"]\)/);
    expect(SRC).not.toMatch(/\.rpc\(/);
    expect(SRC).not.toMatch(/@\/integrations\/supabase\/client/);
  });

  it('does NOT expose sensitive provider fields or raw payloads', () => {
    expect(SRC).not.toMatch(/provider_intent_id/);
    expect(SRC).not.toMatch(/idempotency_key/);
    expect(SRC).not.toMatch(/processing_error/);
    expect(SRC).not.toMatch(/receipt_url/);
    expect(SRC).not.toMatch(/JSON\.stringify/);
    expect(SRC).not.toMatch(/\.payload\b/);
    expect(SRC).not.toMatch(/['"]payload['"]/);
    expect(SRC).not.toMatch(/signature/);
    expect(SRC).not.toMatch(/token/);
    expect(SRC).not.toMatch(/secret/);
  });

  it('does NOT import any payment/refund mutation', () => {
    expect(SRC).not.toMatch(/markMembershipPaidManually/);
    expect(SRC).not.toMatch(/markMembershipRefundedManually/);
    expect(SRC).not.toMatch(/admin_mark_membership/);
  });

  it('extracts only metadata.manual_refund.refunded_at', () => {
    expect(SRC).toMatch(/manual_refund/);
    expect(SRC).toMatch(/refunded_at/);
  });

  it('marks the page as no-index', () => {
    expect(SRC).toMatch(/useNoIndex/);
  });
});

describe('MembershipInvoice — bilingual copy', () => {
  it('contains invoice title in both languages', () => {
    expect(SRC).toContain('فاتورة عضوية');
    expect(SRC).toContain("'Membership Invoice'");
  });

  it('contains credit-note title in both languages', () => {
    expect(SRC).toContain('إشعار دائن');
    expect(SRC).toContain("'Credit Note'");
  });

  it('contains the internal-document disclosure in both languages', () => {
    expect(SRC).toContain('هذه وثيقة داخلية صادرة من منصة قطاعات.');
    expect(SRC).toContain('This is an internal document issued by Qitaat platform.');
  });

  it('contains print action in both languages', () => {
    expect(SRC).toContain('طباعة');
    expect(SRC).toContain("'Print'");
    expect(SRC).toMatch(/window\.print\(\)/);
  });
});

describe('MembershipInvoice — route registration', () => {
  it('is registered on a protected route at /membership/payments/:paymentIntentId/invoice', () => {
    expect(APP).toContain('/membership/payments/:paymentIntentId/invoice');
    expect(APP).toMatch(/<ProtectedRoute>\s*<MembershipInvoice/);
  });
});

describe('MembershipPaymentHistory — invoice / credit-note links', () => {
  it('renders View invoice link for succeeded intents', () => {
    expect(HISTORY).toContain('View invoice');
    expect(HISTORY).toContain('عرض الفاتورة');
  });

  it('renders View credit note link for refunded intents', () => {
    expect(HISTORY).toContain('View credit note');
    expect(HISTORY).toContain('عرض الإشعار الدائن');
  });

  it('links to /membership/payments/:id/invoice', () => {
    expect(HISTORY).toMatch(/\/membership\/payments\/\$\{[^}]+\}\/invoice/);
  });

  it('still avoids direct table access and mutations', () => {
    expect(HISTORY).not.toMatch(/from\(['"]membership_payment_intents['"]\)/);
    expect(HISTORY).not.toMatch(/markMembershipPaidManually/);
    expect(HISTORY).not.toMatch(/markMembershipRefundedManually/);
  });
});

describe('AdminMembershipPayments — invoice / credit-note links', () => {
  it('renders View invoice for paid rows and View credit note for refunded rows', () => {
    expect(ADMIN).toContain('View invoice');
    expect(ADMIN).toContain('عرض الفاتورة');
    expect(ADMIN).toContain('View credit note');
    expect(ADMIN).toContain('عرض الإشعار الدائن');
  });

  it('links to /membership/payments/:id/invoice', () => {
    expect(ADMIN).toMatch(/\/membership\/payments\/\$\{[^}]+\}\/invoice/);
  });
});