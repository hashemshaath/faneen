import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * CT-6 — Guards that AdminContractTemplates and EditorPanels route all
 * contract_template_pricing_rules / contract_template_required_fields /
 * contract_template_attachments access through the CT-6 service wrappers.
 */

const SRC = resolve(__dirname, '../../../../');
const read = (rel: string) => readFileSync(resolve(SRC, rel), 'utf8');

const NO_PRICING = /\.from\(\s*['"]contract_template_pricing_rules['"]\s*\)/;
const NO_REQUIRED = /\.from\(\s*['"]contract_template_required_fields['"]\s*\)/;
const NO_ATTACH = /\.from\(\s*['"]contract_template_attachments['"]\s*\)/;

describe('CT-6 migration: AdminContractTemplates uses CT-6 services', () => {
  const s = read('pages/admin/AdminContractTemplates.tsx');

  it('no direct CT-6 template child-table access', () => {
    expect(s).not.toMatch(NO_PRICING);
    expect(s).not.toMatch(NO_REQUIRED);
    expect(s).not.toMatch(NO_ATTACH);
  });

  it('cloneDraft uses list+create services for pricing/required/attachments', () => {
    expect(s).toMatch(/listContractTemplatePricingRules\(/);
    expect(s).toMatch(/createContractTemplatePricingRule\(/);
    expect(s).toMatch(/listContractTemplateRequiredFields\(/);
    expect(s).toMatch(/createContractTemplateRequiredField\(/);
    expect(s).toMatch(/listContractTemplateAttachments\(/);
    expect(s).toMatch(/createContractTemplateAttachment\(/);
  });

  it('preserves CT-5 section/clause services in cloneDraft', () => {
    expect(s).toMatch(/listContractTemplateSectionsByVersionIds\(/);
    expect(s).toMatch(/listContractTemplateClausesBySectionIds\(/);
    expect(s).toMatch(/createContractTemplateSection</);
    expect(s).toMatch(/createContractTemplateClause\(/);
  });
});

describe('CT-6 migration: EditorPanels uses CT-6 services', () => {
  const s = read('components/admin/contract-templates/EditorPanels.tsx');

  it('no direct CT-6 template child-table access', () => {
    expect(s).not.toMatch(NO_PRICING);
    expect(s).not.toMatch(NO_REQUIRED);
    expect(s).not.toMatch(NO_ATTACH);
  });

  it('PricingRulesPanel uses CT-6 pricing services', () => {
    expect(s).toMatch(/listContractTemplatePricingRules\(/);
    expect(s).toMatch(/createContractTemplatePricingRule\(/);
    expect(s).toMatch(/updateContractTemplatePricingRule\(/);
    expect(s).toMatch(/deleteContractTemplatePricingRule\(/);
  });

  it('RequiredFieldsPanel uses CT-6 required-field services', () => {
    expect(s).toMatch(/listContractTemplateRequiredFields\(/);
    expect(s).toMatch(/createContractTemplateRequiredField\(/);
    expect(s).toMatch(/updateContractTemplateRequiredField\(/);
    expect(s).toMatch(/deleteContractTemplateRequiredField\(/);
  });

  it('AttachmentsPanel uses CT-6 template-attachment services', () => {
    expect(s).toMatch(/listContractTemplateAttachments\(/);
    expect(s).toMatch(/createContractTemplateAttachment\(/);
    expect(s).toMatch(/updateContractTemplateAttachment\(/);
    expect(s).toMatch(/deleteContractTemplateAttachment\(/);
  });

  it('CT-5 section/clause services remain in use', () => {
    expect(s).toMatch(/listContractTemplateSections\(/);
    expect(s).toMatch(/listContractTemplateClausesBySectionIds\(/);
    expect(s).toMatch(/createContractTemplateSection\(/);
    expect(s).toMatch(/updateContractTemplateSection\(/);
    expect(s).toMatch(/deleteContractTemplateSection\(/);
    expect(s).toMatch(/createContractTemplateClause\(/);
    expect(s).toMatch(/updateContractTemplateClause\(/);
    expect(s).toMatch(/deleteContractTemplateClause\(/);
  });
});

describe('CT-6 out-of-scope surfaces remain untouched', () => {
  it('runtime contract_attachments service still owns the runtime table', () => {
    const s = read('modules/contracts/services/childTables/attachments.ts');
    expect(s).toMatch(/\.from\(['"]contract_attachments['"]\)/);
  });
});