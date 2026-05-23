import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * CT-7 — Guards that runtime contract attachment storage access is
 * routed through the CT-7 services and the table CRUD continues to use
 * the existing CT-4 child-table services. Out-of-scope template
 * attachments (CT-6) and unrelated tables must remain untouched.
 */

const SRC = resolve(__dirname, '../../../../');
const read = (rel: string) => readFileSync(resolve(SRC, rel), 'utf8');

const NO_STORAGE_LITERAL = /storage\s*\.\s*from\(\s*['"]contract-attachments['"]\s*\)/;
const NO_TABLE = /\.from\(\s*['"]contract_attachments['"]\s*\)/;

const targets = [
  'components/contract/ContractAttachmentsTab.tsx',
  'components/contract/MeasurementAttachmentsPanel.tsx',
  'components/contract/PaymentReceiptPanel.tsx',
  'pages/dashboard/DashboardContracts.tsx',
  'lib/contract-attachments.ts',
];

describe('CT-7 migration: storage bucket literal removed from app callsites', () => {
  for (const rel of targets) {
    it(`${rel} has no direct contract-attachments storage literal`, () => {
      const s = read(rel);
      expect(s).not.toMatch(NO_STORAGE_LITERAL);
    });
  }
});

describe('CT-7 migration: contract_attachments table not accessed directly outside services', () => {
  for (const rel of targets) {
    it(`${rel} has no direct from('contract_attachments')`, () => {
      const s = read(rel);
      expect(s).not.toMatch(NO_TABLE);
    });
  }
});

describe('CT-7 migration: callsites import CT-7 storage services', () => {
  it('ContractAttachmentsTab uses upload/getPublicUrl/remove services', () => {
    const s = read('components/contract/ContractAttachmentsTab.tsx');
    expect(s).toMatch(/uploadContractAttachmentFile\(/);
    expect(s).toMatch(/getContractAttachmentPublicUrl\(/);
    expect(s).toMatch(/removeContractAttachmentFiles\(/);
    expect(s).toMatch(/createContractAttachment\(/);
  });

  it('PaymentReceiptPanel uses upload/getPublicUrl/remove services', () => {
    const s = read('components/contract/PaymentReceiptPanel.tsx');
    expect(s).toMatch(/uploadContractAttachmentFile\(/);
    expect(s).toMatch(/getContractAttachmentPublicUrl\(/);
    expect(s).toMatch(/removeContractAttachmentFiles\(/);
  });

  it('MeasurementAttachmentsPanel uses upload/getPublicUrl/remove services', () => {
    const s = read('components/contract/MeasurementAttachmentsPanel.tsx');
    expect(s).toMatch(/uploadContractAttachmentFile\(/);
    expect(s).toMatch(/getContractAttachmentPublicUrl\(/);
    expect(s).toMatch(/removeContractAttachmentFiles\(/);
  });

  it('DashboardContracts uses upload/getPublicUrl services', () => {
    const s = read('pages/dashboard/DashboardContracts.tsx');
    expect(s).toMatch(/uploadContractAttachmentFile\(/);
    expect(s).toMatch(/getContractAttachmentPublicUrl\(/);
  });

  it('lib/contract-attachments uses CT-7 signed-url + remove + CT-4 deleteContractAttachmentById', () => {
    const s = read('lib/contract-attachments.ts');
    expect(s).toMatch(/createSignedContractAttachmentUrl\(/);
    expect(s).toMatch(/removeContractAttachmentFiles\(/);
    expect(s).toMatch(/deleteContractAttachmentById\(/);
    expect(s).toMatch(/CONTRACT_ATTACHMENTS_BUCKET/);
  });
});

describe('CT-7 out-of-scope surfaces remain untouched', () => {
  it('CT-6 template attachment services own contract_template_attachments', () => {
    const s = read('modules/contracts/services/templates/index.ts');
    expect(s).toMatch(/\.from\(['"]contract_template_attachments['"]\)/);
  });

  it('CT-4 child-table service still owns contract_attachments table CRUD', () => {
    const s = read('modules/contracts/services/childTables/attachments.ts');
    expect(s).toMatch(/\.from\(['"]contract_attachments['"]\)/);
  });

  it('aggregates service still owns its contract_attachments aggregate read', () => {
    const s = read('modules/contracts/services/aggregates.ts');
    expect(s).toMatch(/\.from\(['"]contract_attachments['"]\)/);
  });
});