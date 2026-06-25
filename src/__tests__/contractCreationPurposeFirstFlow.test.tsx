/**
 * CONTRACT CREATION PURPOSE-FIRST FLOW — wizard order + party rules.
 *
 * Source-level guards (DashboardContracts.tsx is a 3k+ line page;
 * RTL mounting requires a full Supabase/Router stack that is mocked
 * elsewhere). The asserts below lock in the structural invariants
 * the user signed off on:
 *   1) Purpose is the first step.
 *   2) Parties comes after purpose, before template.
 *   3) Template comes after parties.
 *   4) Provider/owner never sees a provider picker for themselves.
 *   5) Personal client never sees a client picker for themselves.
 *   6) Unpublished templates are not surfaced (filterContractTemplates
 *      is the only template gate and excludes isPublished === false).
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const PAGE = readFileSync(resolve('src/pages/dashboard/DashboardContracts.tsx'), 'utf8');
const FILTER = readFileSync(resolve('src/modules/contracts/services/filterContractTemplates.ts'), 'utf8');
const PANEL = readFileSync(resolve('src/components/contracts/dashboard/create/ContractPartiesPanel.tsx'), 'utf8');

describe('Contract creation — purpose-first wizard order', () => {
  it('1) stepOrder starts with the purpose step (work-type)', () => {
    expect(PAGE).toMatch(/stepOrder:\s*StepKey\[\]\s*=\s*\[\s*'work'\s*,/);
    expect(PAGE).toMatch(/useState<StepKey>\('work'\)/);
  });
  it('2) parties (client) step comes after purpose and before template', () => {
    // Step order updated to: work → client → site → template → details → pricing → review.
    // 'site' was promoted before 'template' so site-derived defaults populate the template step.
    expect(PAGE).toMatch(/\[\s*'work'\s*,\s*'client'\s*,\s*'site'\s*,\s*'template'\s*,/);
  });
  it('3) the displayed stepper labels purpose first', () => {
    const idxPurpose = PAGE.indexOf("key: 'work'");
    const idxClient = PAGE.indexOf("key: 'client'");
    const idxTemplate = PAGE.indexOf("key: 'template'");
    const idxReview = PAGE.indexOf("key: 'review'");
    expect(idxPurpose).toBeGreaterThan(0);
    expect(idxPurpose).toBeLessThan(idxClient);
    expect(idxClient).toBeLessThan(idxTemplate);
    expect(idxTemplate).toBeLessThan(idxReview);
    expect(PAGE).toContain('الغرض / التخصص');
    expect(PAGE).toContain('Purpose');
  });
});

describe('Contract creation — party rules', () => {
  it('4) provider/owner: ContractPartiesPanel renders without a provider picker', () => {
    expect(PAGE).toMatch(/<ContractPartiesPanel\b/);
    expect(PAGE).not.toMatch(/<ProviderPicker\b/);
    expect(PAGE).not.toMatch(/openProviderPicker/);
    expect(PANEL).toContain('يتم اعتماد منشأتك تلقائيًا — لا حاجة لاختيار مزود.');
  });
  it('5) personal client: auto-filled as second party, no self picker', () => {
    expect(PAGE).toMatch(/if\s*\(\s*!isClientOnlyAccount\s*\)\s*return/);
    expect(PAGE).toMatch(/setSelectedClient\(\{\s*\n\s*user_id:\s*user\.id/);
    expect(PANEL).toContain('تم تعبئة بياناتك تلقائيًا — لا حاجة لاختيار عميل.');
  });
});

describe('Contract creation — template filtering', () => {
  it('6) filterContractTemplates excludes unpublished and inactive templates', () => {
    expect(FILTER).toMatch(/if\s*\(tpl\.isPublished\s*===\s*false\)\s*continue;/);
    expect(FILTER).toMatch(/if\s*\(tpl\.isActive\s*===\s*false\)\s*continue;/);
  });
  it('returned shape exposes specialized + general buckets', () => {
    expect(FILTER).toMatch(/specialized:/);
    expect(FILTER).toMatch(/general:/);
    expect(FILTER).toMatch(/hasSpecialized:/);
  });
  it('no service_role / any / hardcoded uuid in new helpers or page step config', () => {
    for (const src of [FILTER, PANEL]) {
      expect(src).not.toMatch(/service_role/i);
      expect(src).not.toMatch(/:\s*any\b/);
      expect(src).not.toMatch(/\bas\s+any\b/);
      expect(src).not.toMatch(/@ts-ignore|eslint-disable/);
      expect(src).not.toMatch(/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/);
    }
  });
});