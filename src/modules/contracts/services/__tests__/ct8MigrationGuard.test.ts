import { describe, it, expect } from 'vitest';
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * CT-8 — Re-audit guard. Asserts that the app layer (pages / components /
 * hooks / lib) contains zero direct `.from('contract_measurements' |
 * 'contract_milestones' | 'contract_notes')` calls. The contracts
 * service layer and tests are excluded.
 */

const SRC = resolve(__dirname, '../../../../');
const read = (rel: string) => readFileSync(resolve(SRC, rel), 'utf8');

const TABLES = ['contract_measurements', 'contract_milestones', 'contract_notes'];

describe('CT-8 re-audit: no direct app-layer access to target tables', () => {
  for (const table of TABLES) {
    it(`no .from('${table}') outside service/test layer`, () => {
      const pattern = `\\.from\\(['\\\"]${table}['\\\"]\\)`;
      let out = '';
      try {
        out = execSync(
          `rg -l --pcre2 "${pattern}" src ` +
            `-g '!src/modules/contracts/services/**' ` +
            `-g '!**/__tests__/**' ` +
            `-g '!src/integrations/supabase/**'`,
          { encoding: 'utf8' },
        );
      } catch {
        // rg exits 1 when no matches — that's the desired state.
        out = '';
      }
      expect(out.trim()).toBe('');
    });
  }
});

describe('CT-8: ContractDetail + DashboardContracts still go through services', () => {
  it('ContractDetail uses measurement/milestone/note services', () => {
    const s = read('pages/ContractDetail.tsx');
    expect(s).toMatch(/listContractMeasurements\(/);
    expect(s).toMatch(/listContractMilestones\(/);
    expect(s).toMatch(/listContractNotes\(/);
  });

  it('DashboardContracts uses measurement/milestone/note mutation services', () => {
    const s = read('pages/dashboard/DashboardContracts.tsx');
    expect(s).toMatch(/createContractMeasurement\(/);
    expect(s).toMatch(/createContractMilestone\(/);
    expect(s).toMatch(/updateContractMilestone\(/);
    expect(s).toMatch(/createContractNote\(/);
  });
});