import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * CT-5 — Guards that contract template admin/editor pages and components
 * route all contract_template* and contract_measurement_methods access
 * through the CT-5 service wrappers.
 */

const SRC = resolve(__dirname, '../../../../');
const read = (rel: string) => readFileSync(resolve(SRC, rel), 'utf8');

const NO_TEMPLATES = /\.from\(\s*['"]contract_templates['"]\s*\)/;
const NO_VERSIONS = /\.from\(\s*['"]contract_template_versions['"]\s*\)/;
const NO_SECTIONS = /\.from\(\s*['"]contract_template_sections['"]\s*\)/;
const NO_CLAUSES = /\.from\(\s*['"]contract_template_clauses['"]\s*\)/;
const NO_METHODS = /\.from\(\s*['"]contract_measurement_methods['"]\s*\)/;

describe('CT-5 migration: AdminContractTemplates uses template services', () => {
  const s = read('pages/admin/AdminContractTemplates.tsx');

  it('uses CT-5 template services', () => {
    expect(s).toMatch(/listContractMeasurementMethods\(/);
    expect(s).toMatch(/listContractTemplateVersions\(/);
    expect(s).toMatch(/listContractTemplateSectionsByVersionIds\(/);
    expect(s).toMatch(/listContractTemplateClausesBySectionIds\(/);
    expect(s).toMatch(/listContractTemplateSections\(/);
    expect(s).toMatch(/createContractTemplateVersion</);
    expect(s).toMatch(/createContractTemplateSection</);
    expect(s).toMatch(/createContractTemplateClause\(/);
    expect(s).toMatch(/updateContractTemplateById\(/);
  });

  it('no direct in-scope template table access', () => {
    expect(s).not.toMatch(NO_TEMPLATES);
    expect(s).not.toMatch(NO_VERSIONS);
    expect(s).not.toMatch(NO_SECTIONS);
    expect(s).not.toMatch(NO_CLAUSES);
    expect(s).not.toMatch(NO_METHODS);
  });
});

describe('CT-5 migration: EditorPanels uses template services', () => {
  const s = read('components/admin/contract-templates/EditorPanels.tsx');

  it('uses CT-5 section/clause services', () => {
    expect(s).toMatch(/listContractTemplateSections\(/);
    expect(s).toMatch(/listContractTemplateClausesBySectionIds\(/);
    expect(s).toMatch(/createContractTemplateSection\(/);
    expect(s).toMatch(/updateContractTemplateSection\(/);
    expect(s).toMatch(/deleteContractTemplateSection\(/);
    expect(s).toMatch(/createContractTemplateClause\(/);
    expect(s).toMatch(/updateContractTemplateClause\(/);
    expect(s).toMatch(/deleteContractTemplateClause\(/);
  });

  it('no direct contract_template_sections/clauses access', () => {
    expect(s).not.toMatch(NO_SECTIONS);
    expect(s).not.toMatch(NO_CLAUSES);
  });
});

describe('CT-5 deferred surfaces remain untouched', () => {
  it('listActiveContractTemplates service still owns contract_templates select', () => {
    const s = read('modules/contracts/services/reads/listActiveContractTemplates.ts');
    expect(s).toMatch(/\.from\(['"]contract_templates['"]\)/);
  });

  it('EditorPanels no longer accesses CT-6 child tables directly (migrated)', () => {
    const s = read('components/admin/contract-templates/EditorPanels.tsx');
    expect(s).not.toMatch(/\.from\(['"]contract_template_pricing_rules['"]\)/);
    expect(s).not.toMatch(/\.from\(['"]contract_template_required_fields['"]\)/);
    expect(s).not.toMatch(/\.from\(['"]contract_template_attachments['"]\)/);
  });
});