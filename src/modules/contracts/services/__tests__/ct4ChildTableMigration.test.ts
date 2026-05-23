import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const SRC = resolve(__dirname, '../../../../');
const read = (rel: string) => readFileSync(resolve(SRC, rel), 'utf8');

/**
 * CT-4 — Guards that contract child-table reads/writes in the app layer
 * (pages/components/hooks) go through the new service wrappers and no
 * longer reach into supabase.from('contract_*') directly.
 */

const NO_MILESTONES = /\.from\(\s*['"]contract_milestones['"]\s*\)/;
const NO_NOTES = /\.from\(\s*['"]contract_notes['"]\s*\)/;
const NO_MEASUREMENTS = /\.from\(\s*['"]contract_measurements['"]\s*\)/;
const NO_ATTACHMENTS = /\.from\(\s*['"]contract_attachments['"]\s*\)/;
const NO_INSTALL_PLANS = /\.from\(\s*['"]installment_plans['"]\s*\)/;
const NO_INSTALL_PAYMENTS = /\.from\(\s*['"]installment_payments['"]\s*\)/;

describe('CT-4 migration: ContractDetail uses child-table services', () => {
  const s = read('pages/ContractDetail.tsx');

  it('uses milestone / note / measurement / attachment list services', () => {
    expect(s).toMatch(/listContractMilestones\(/);
    expect(s).toMatch(/listContractNotes\(/);
    expect(s).toMatch(/listContractMeasurements\(/);
    expect(s).toMatch(/listContractAttachments\(/);
  });

  it('uses installment list services', () => {
    expect(s).toMatch(/listInstallmentPlansForContract\(/);
    expect(s).toMatch(/listInstallmentPaymentsByPlanIds\(/);
  });

  it('uses mutation services for notes / measurements / milestones / installment payments', () => {
    expect(s).toMatch(/createContractNote\(/);
    expect(s).toMatch(/deleteContractNote\(/);
    expect(s).toMatch(/createContractMeasurement\(/);
    expect(s).toMatch(/updateContractMeasurement\(/);
    expect(s).toMatch(/deleteContractMeasurement\(/);
    expect(s).toMatch(/createContractMilestone\(/);
    expect(s).toMatch(/updateInstallmentPayment\(/);
    expect(s).toMatch(/updateInstallmentPaymentIfStatus\(/);
  });

  it('no direct child-table table access', () => {
    expect(s).not.toMatch(NO_MILESTONES);
    expect(s).not.toMatch(NO_NOTES);
    expect(s).not.toMatch(NO_MEASUREMENTS);
    expect(s).not.toMatch(NO_ATTACHMENTS);
    expect(s).not.toMatch(NO_INSTALL_PLANS);
    expect(s).not.toMatch(NO_INSTALL_PAYMENTS);
  });
});

describe('CT-4 migration: DashboardContracts uses child-table services', () => {
  const s = read('pages/dashboard/DashboardContracts.tsx');

  it('uses note / measurement / milestone / attachment / installment services', () => {
    expect(s).toMatch(/createContractNote\(/);
    expect(s).toMatch(/createContractMeasurement\(/);
    expect(s).toMatch(/createContractMilestone\(/);
    expect(s).toMatch(/updateContractMilestone\(/);
    expect(s).toMatch(/createContractAttachment\(/);
    expect(s).toMatch(/getInstallmentPlanIdForContract\(/);
    expect(s).toMatch(/createInstallmentPlan</);
    expect(s).toMatch(/createInstallmentPayments\(/);
    expect(s).toMatch(/updateInstallmentPayment\(/);
  });

  it('no direct child-table table access', () => {
    expect(s).not.toMatch(NO_MILESTONES);
    expect(s).not.toMatch(NO_NOTES);
    expect(s).not.toMatch(NO_MEASUREMENTS);
    expect(s).not.toMatch(NO_ATTACHMENTS);
    expect(s).not.toMatch(NO_INSTALL_PLANS);
    expect(s).not.toMatch(NO_INSTALL_PAYMENTS);
  });
});

describe('CT-4 migration: contract components use child-table services', () => {
  it('PaymentScheduleGenerator uses installment services', () => {
    const s = read('components/contract/PaymentScheduleGenerator.tsx');
    expect(s).toMatch(/createInstallmentPlan</);
    expect(s).toMatch(/createInstallmentPayments\(/);
    expect(s).not.toMatch(NO_INSTALL_PLANS);
    expect(s).not.toMatch(NO_INSTALL_PAYMENTS);
  });

  it('ContractAttachmentsTab uses createContractAttachment', () => {
    const s = read('components/contract/ContractAttachmentsTab.tsx');
    expect(s).toMatch(/createContractAttachment\(/);
    expect(s).not.toMatch(NO_ATTACHMENTS);
  });

  it('PaymentReceiptPanel uses createContractAttachment', () => {
    const s = read('components/contract/PaymentReceiptPanel.tsx');
    expect(s).toMatch(/createContractAttachment\(/);
    expect(s).not.toMatch(NO_ATTACHMENTS);
  });

  it('MeasurementAttachmentsPanel uses createContractAttachment', () => {
    const s = read('components/contract/MeasurementAttachmentsPanel.tsx');
    expect(s).toMatch(/createContractAttachment\(/);
    expect(s).not.toMatch(NO_ATTACHMENTS);
  });
});

describe('CT-4 deferred surfaces remain untouched', () => {
  it('lib/contract-attachments.ts delete+storage helper now routes through CT-4 + CT-7 services', () => {
    const s = read('lib/contract-attachments.ts');
    expect(s).toMatch(/deleteContractAttachmentById\(/);
    expect(s).toMatch(/removeContractAttachmentFiles\(/);
    expect(s).not.toMatch(/\.from\(['"]contract_attachments['"]\)\.delete\(/);
  });

  it('DashboardInstallments page is deferred (standalone installments dashboard)', () => {
    const s = read('pages/dashboard/DashboardInstallments.tsx');
    expect(s).toMatch(NO_INSTALL_PLANS);
    expect(s).toMatch(NO_INSTALL_PAYMENTS);
  });

  it('overview widget shared.tsx remains deferred (dashboard overview widget)', () => {
    const s = read('components/dashboard/overview/shared.tsx');
    expect(s).toMatch(NO_INSTALL_PAYMENTS);
  });
});