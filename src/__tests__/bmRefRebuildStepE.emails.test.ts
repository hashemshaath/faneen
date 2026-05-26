import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * BM-REF-REBUILD-1 — Step E (emails/notifications addendum)
 *
 * Guards the transactional email + notification dispatch surfaces against
 * leaking unsafe identifiers (provider_intent_id, synthetic phone email,
 * raw token) as the primary user-facing reference, and confirms the
 * membership paid/refunded path now surfaces the official PAY ref_id.
 */

const read = (p: string) => readFileSync(resolve(p), 'utf8');
const TPL_DIR = 'supabase/functions/_shared/transactional-email-templates';
const templateFiles = readdirSync(resolve(TPL_DIR))
  .filter((f) => f.endsWith('.tsx'));

describe('Step E — transactional email templates never expose unsafe identifiers', () => {
  it('no template references provider_intent_id', () => {
    for (const f of templateFiles) {
      const src = read(`${TPL_DIR}/${f}`);
      expect(src, `${f} must not reference provider_intent_id`).not.toMatch(/provider_intent_id/);
    }
  });

  it('no template embeds @phone.qitaat.local', () => {
    for (const f of templateFiles) {
      const src = read(`${TPL_DIR}/${f}`);
      expect(src, `${f} must not embed synthetic phone email`).not.toMatch(/phone\.qitaat\.local/);
    }
  });

  it('invitation templates never display the invite token as the official reference label', () => {
    // The token may appear inside acceptUrl/href, but must not be rendered as
    // a primary text identifier (e.g. inside a Heading / ReferenceBadge value).
    const invite = read(`${TPL_DIR}/business-staff-invitation.tsx`);
    expect(invite).not.toMatch(/<Heading[^>]*>\s*\{[^}]*token[^}]*\}/);
  });
});

describe('Step E — membership paid/refunded templates accept PAY/SUB reference props', () => {
  const paid = read(`${TPL_DIR}/membership-payment-marked-paid.tsx`);
  const refunded = read(`${TPL_DIR}/membership-payment-marked-refunded.tsx`);

  it('paid template declares paymentRef + subscriptionRef props', () => {
    expect(paid).toMatch(/paymentRef\?:\s*string\s*\|\s*null/);
    expect(paid).toMatch(/subscriptionRef\?:\s*string\s*\|\s*null/);
  });

  it('refunded template declares paymentRef + subscriptionRef props', () => {
    expect(refunded).toMatch(/paymentRef\?:\s*string\s*\|\s*null/);
    expect(refunded).toMatch(/subscriptionRef\?:\s*string\s*\|\s*null/);
  });

  it('paid template renders a "Payment reference" detail row when paymentRef is present', () => {
    expect(paid).toMatch(/labelEn:\s*['"]Payment reference['"]/);
  });

  it('refunded template renders a "Payment reference" detail row when paymentRef is present', () => {
    expect(refunded).toMatch(/labelEn:\s*['"]Payment reference['"]/);
  });
});

describe('Step E — manual mark paid/refunded dispatch uses safe reference helpers', () => {
  const PAID = read('src/modules/memberships/services/payments/manualMarkPaid.ts');
  const REFUNDED = read('src/modules/memberships/services/payments/manualMarkRefunded.ts');

  it('manualMarkPaid imports getPaymentDisplayReference and getEmailDeliveryAddress', () => {
    expect(PAID).toContain('getPaymentDisplayReference');
    expect(PAID).toContain('getEmailDeliveryAddress');
  });

  it('manualMarkRefunded imports getPaymentDisplayReference and getEmailDeliveryAddress', () => {
    expect(REFUNDED).toContain('getPaymentDisplayReference');
    expect(REFUNDED).toContain('getEmailDeliveryAddress');
  });

  it('manualMarkPaid passes paymentRef + subscriptionRef in templateData', () => {
    expect(PAID).toMatch(/paymentRef[,\s]/);
    expect(PAID).toMatch(/subscriptionRef[,\s]/);
  });

  it('manualMarkRefunded passes paymentRef + subscriptionRef in templateData', () => {
    expect(REFUNDED).toMatch(/paymentRef[,\s]/);
    expect(REFUNDED).toMatch(/subscriptionRef[,\s]/);
  });

  it('dispatch sites never embed @phone.qitaat.local literal', () => {
    expect(PAID).not.toMatch(/phone\.qitaat\.local/);
    expect(REFUNDED).not.toMatch(/phone\.qitaat\.local/);
  });

  it('dispatch sites never inline provider_intent_id into templateData', () => {
    // Allow comment mentions, but not as a property in templateData.
    expect(PAID).not.toMatch(/templateData:\s*\{[\s\S]*provider_intent_id/);
    expect(REFUNDED).not.toMatch(/templateData:\s*\{[\s\S]*provider_intent_id/);
  });

  it('dispatch sites do not introduce functions.invoke (must go through wrapper)', () => {
    expect(PAID).not.toMatch(/supabase\.functions\.invoke\(/);
    expect(REFUNDED).not.toMatch(/supabase\.functions\.invoke\(/);
  });

  it('idempotency keys remain stable internal (mp-paid- / mp-refund-)', () => {
    expect(PAID).toMatch(/mp-paid-\$\{paymentIntentId\}/);
    expect(REFUNDED).toMatch(/mp-refund-\$\{paymentIntentId\}/);
  });
});