import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * BM-REF-REBUILD-1 — Step D
 *
 * Source-level guard rails for UI safety swaps that surface the new
 * official ref_id values (ENT / PAY / etc.) instead of legacy / unsafe
 * identifiers, while preserving routes, RLS, schema, and edge behavior.
 */

const read = (p: string) => readFileSync(resolve(p), 'utf8');

const ADMIN_PAYMENTS = read('src/pages/admin/AdminMembershipPayments.tsx');
const HISTORY = read('src/components/membership/MembershipPaymentHistory.tsx');
const STATUS = read('src/components/membership/MembershipPaymentStatus.tsx');
const INVOICE = read('src/pages/MembershipInvoice.tsx');
const USER_DETAIL = read('src/pages/admin/AdminUserDetail.tsx');
const ADMIN_BIZ = read('src/pages/admin/AdminBusinesses.tsx');
const LEGACY_HINT = read('src/components/reference/LegacyReferenceHint.tsx');
const APP = read('src/App.tsx');

describe('Step D — Reference display utilities exist and are importable', () => {
  it('LegacyReferenceHint exists with bilingual copy', () => {
    expect(LEGACY_HINT).toContain('Previously');
    expect(LEGACY_HINT).toContain('المعرف السابق');
  });

  it('ReferenceBadge file exists', () => {
    expect(() => read('src/components/reference/ReferenceBadge.tsx')).not.toThrow();
  });
});

describe('Step D — Admin payments surface PAY ref_id and relabel provider', () => {
  it('selects ref_id from membership_payment_intents', () => {
    expect(ADMIN_PAYMENTS).toMatch(/select[^']*ref_id/);
  });

  it('renders a dedicated Payment Ref column header (EN + AR)', () => {
    expect(ADMIN_PAYMENTS).toContain('Payment Ref');
    expect(ADMIN_PAYMENTS).toContain('مرجع الدفع');
  });

  it('relabels provider_intent_id column as Provider ID, not Provider Intent', () => {
    expect(ADMIN_PAYMENTS).toContain('Provider ID');
    expect(ADMIN_PAYMENTS).toContain('معرف مزود الدفع');
    expect(ADMIN_PAYMENTS).not.toMatch(/'Provider Intent'/);
  });
});

describe('Step D — User payment surfaces show PAY ref_id, never provider_intent_id', () => {
  it('MembershipPaymentHistory selects ref_id', () => {
    expect(HISTORY).toMatch(/SAFE_SELECT[^;]*ref_id/);
  });

  it('MembershipPaymentStatus selects ref_id', () => {
    expect(STATUS).toMatch(/SAFE_SELECT[^;]*ref_id/);
  });

  it('MembershipPaymentHistory renders a Reference label', () => {
    expect(HISTORY).toContain('Reference:');
    expect(HISTORY).toContain('المرجع:');
  });

  it('MembershipPaymentStatus renders a Payment reference label', () => {
    expect(STATUS).toContain('Payment reference:');
    expect(STATUS).toContain('مرجع الدفع:');
  });

  it('User-facing surfaces never display provider_intent_id', () => {
    expect(HISTORY).not.toMatch(/provider_intent_id/);
    expect(STATUS).not.toMatch(/provider_intent_id/);
    expect(INVOICE).not.toMatch(/provider_intent_id/);
  });

  it('User-facing surfaces never render the synthetic phone email domain', () => {
    expect(HISTORY).not.toMatch(/phone\.qitaat\.local/);
    expect(STATUS).not.toMatch(/phone\.qitaat\.local/);
    expect(INVOICE).not.toMatch(/phone\.qitaat\.local/);
  });
});

describe('Step D — Invoice prefers PAY ref_id over UUID', () => {
  it('selects ref_id on the payment intent', () => {
    expect(INVOICE).toMatch(/SAFE_SELECT[^;]*'id, ref_id/);
  });

  it('renders ref_id with UUID fallback for Document ID', () => {
    expect(INVOICE).toMatch(/data\.ref_id\s*\?\?\s*data\.id/);
  });

  it('joins business.legacy_ref_id for legacy hint compatibility', () => {
    expect(INVOICE).toContain('legacy_ref_id');
  });
});

describe('Step D — Business display uses ENT primary + BIZ legacy hint', () => {
  it('AdminUserDetail selects legacy_ref_id', () => {
    expect(USER_DETAIL).toContain('legacy_ref_id');
  });

  it('AdminUserDetail imports getBusinessDisplayReference and LegacyReferenceHint', () => {
    expect(USER_DETAIL).toContain('getBusinessDisplayReference');
    expect(USER_DETAIL).toContain('LegacyReferenceHint');
  });

  it('AdminBusinesses editor exposes a Previously / legacy ref line', () => {
    expect(ADMIN_BIZ).toMatch(/Previously|المعرف السابق/);
    expect(ADMIN_BIZ).toContain('legacy_ref_id');
  });
});

describe('Step D — Route surface unchanged', () => {
  it('does not reintroduce the broken /dashboard/membership route', () => {
    expect(APP).not.toContain('/dashboard/membership');
  });

  it('keeps the canonical /membership/payments/:paymentIntentId/invoice route', () => {
    expect(APP).toContain('/membership/payments/:paymentIntentId/invoice');
  });
});

describe('Step D — Tokens never rendered as official reference', () => {
  it('AdminMembershipPayments never renders an invitation token field', () => {
    expect(ADMIN_PAYMENTS).not.toMatch(/\binvitation_token\b/);
  });

  it('User payment surfaces never reference invitation_token', () => {
    expect(HISTORY).not.toMatch(/\binvitation_token\b/);
    expect(STATUS).not.toMatch(/\binvitation_token\b/);
    expect(INVOICE).not.toMatch(/\binvitation_token\b/);
  });
});
