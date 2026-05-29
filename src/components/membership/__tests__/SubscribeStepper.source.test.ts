import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * Source-level integration guarantees for the 2-step inline subscription
 * flow. We assert the contract surface (props, payment wiring, VAT math,
 * a11y, no-dialog policy) without rendering — keeps the test fast and
 * insulated from upstream UI churn.
 */

const STEPPER = readFileSync(
  resolve('src/components/membership/SubscribeStepper.tsx'),
  'utf8',
);
const PAGE = readFileSync(resolve('src/pages/Membership.tsx'), 'utf8');

describe('SubscribeStepper — contract', () => {
  it('exposes the upgrade + downgrade modes only', () => {
    expect(STEPPER).toMatch(/type Mode = 'upgrade' \| 'downgrade'/);
  });

  it('renders both Arabic and English copy', () => {
    expect(STEPPER).toContain('ترقية الباقة');
    expect(STEPPER).toContain('Plan upgrade');
    expect(STEPPER).toContain('إكمال الاشتراك');
    expect(STEPPER).toContain('Complete subscription');
  });

  it('computes VAT 15% INCLUSIVE — never adds VAT on top of the displayed price', () => {
    // price / 1.15 → tax-exclusive base; remainder is the VAT slice.
    expect(STEPPER).toMatch(/price\s*\/\s*1\.15/);
    expect(STEPPER).toMatch(/price\s*-\s*vatBase/);
    expect(STEPPER).not.toMatch(/price\s*\*\s*1\.15/);
  });

  it('computes the yearly savings percentage from the monthly/yearly prices', () => {
    expect(STEPPER).toMatch(/1\s*-\s*plan\.price_yearly\s*\/\s*\(plan\.price_monthly\s*\*\s*12\)/);
  });

  it('is an inline section, NEVER a Dialog / Popover / modal popup', () => {
    expect(STEPPER).not.toMatch(/from ['"]@\/components\/ui\/dialog['"]/);
    expect(STEPPER).not.toMatch(/from ['"]@\/components\/ui\/sheet['"]/);
    expect(STEPPER).not.toMatch(/from ['"]@\/components\/ui\/alert-dialog['"]/);
    expect(STEPPER).toMatch(/id="subscribe-stepper"/);
    expect(STEPPER).toMatch(/aria-label=/);
  });

  it('never touches Supabase / payment providers directly — uses the props callbacks', () => {
    expect(STEPPER).not.toMatch(/@\/integrations\/supabase\/client/);
    expect(STEPPER).not.toMatch(/functions\.invoke\(/);
    // Mentioning Moyasar in helper copy is fine; what matters is no direct
    // network call or secret usage from the component.
    expect(STEPPER).not.toMatch(/api\.moyasar\.com/);
    expect(STEPPER).not.toMatch(/MOYASAR_SECRET_KEY/);
    expect(STEPPER).not.toMatch(/Authorization:\s*['"`]Basic/i);
    expect(STEPPER).toMatch(/onConfirm/);
    expect(STEPPER).toMatch(/onCancel/);
  });
});

describe('Membership page — stepper wiring', () => {
  it('mounts SubscribeStepper on the public membership page', () => {
    expect(PAGE).toContain('SubscribeStepper');
  });

  it('does not replace the stepper with a dialog/popup', () => {
    expect(PAGE).not.toMatch(/<Dialog[\s>]/);
    expect(PAGE).not.toMatch(/<AlertDialog[\s>]/);
  });
});