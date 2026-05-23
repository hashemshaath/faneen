import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const SRC = resolve(__dirname, '../../../../');
const read = (rel: string) => readFileSync(resolve(SRC, rel), 'utf8');

/**
 * CT-9 — Guards that runtime installment plan/payment access in the app
 * layer goes through the new CT-9 service wrappers and no longer reaches
 * into supabase.from('installment_*') directly.
 */
const NO_INSTALL_PLANS = /\.from\(\s*['"]installment_plans['"]\s*\)/;
const NO_INSTALL_PAYMENTS = /\.from\(\s*['"]installment_payments['"]\s*\)/;

describe('CT-9 installment migration: DashboardInstallments', () => {
  const s = read('pages/dashboard/DashboardInstallments.tsx');

  it('no direct installment_plans / installment_payments access', () => {
    expect(s).not.toMatch(NO_INSTALL_PLANS);
    expect(s).not.toMatch(NO_INSTALL_PAYMENTS);
  });

  it('uses CT-9 services', () => {
    expect(s).toMatch(/listInstallmentPlansWithPaymentsForContracts\(/);
    expect(s).toMatch(/markInstallmentPaymentPaid\(/);
  });
});

describe('CT-9 installment migration: overview/shared.tsx', () => {
  const s = read('components/dashboard/overview/shared.tsx');

  it('no direct installment_payments access', () => {
    expect(s).not.toMatch(NO_INSTALL_PAYMENTS);
  });

  it('uses listOverdueInstallmentPayments', () => {
    expect(s).toMatch(/listOverdueInstallmentPayments\(/);
  });
});

describe('CT-9 out-of-scope surfaces remain untouched', () => {
  it('PaymentScheduleGenerator still routes plan/payment writes through CT-4 child-table services', () => {
    const s = read('components/contract/PaymentScheduleGenerator.tsx');
    expect(s).not.toMatch(NO_INSTALL_PLANS);
    expect(s).not.toMatch(NO_INSTALL_PAYMENTS);
  });

  it('ContractDetail still uses CT-4 installment list/update wrappers', () => {
    const s = read('pages/ContractDetail.tsx');
    expect(s).not.toMatch(NO_INSTALL_PLANS);
    expect(s).not.toMatch(NO_INSTALL_PAYMENTS);
  });
});