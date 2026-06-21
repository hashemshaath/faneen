import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';

const branchesDir = join(process.cwd(), 'src/components/admin/businesses/branches');
const adminBusinessesPath = join(process.cwd(), 'src/pages/admin/AdminBusinesses.tsx');

const REQUIRED = [
  'BusinessBranchesSection.tsx',
  'BusinessBranchCard.tsx',
  'BusinessBranchForm.tsx',
  'BusinessBranchesEmptyState.tsx',
  'types.ts',
];

function readBranch(name: string) {
  return readFileSync(join(branchesDir, name), 'utf8');
}

describe('Phase 5D — AdminBusinesses branches tab extraction', () => {
  it('extracts the required branch components', () => {
    const files = readdirSync(branchesDir);
    for (const required of REQUIRED) {
      expect(files).toContain(required);
    }
  });

  it('AdminBusinesses.tsx wires the branches section (via Phase 5I panel)', () => {
    const src = readFileSync(adminBusinessesPath, 'utf8');
    // Phase 5I — `<BusinessBranchesSection>` is now mounted from the
    // extracted `<BusinessBranchesPanel>` adapter; the parent still
    // owns the branch mutations and forwards them in as props.
    expect(src).toMatch(/<BusinessBranchesPanel\b/);
    expect(src).toMatch(/from '\.\/businesses\/components\/BusinessBranchesPanel'/);
    // CRUD mutations are still owned by the parent page and forwarded
    // as props into the Phase 5I panel adapter.
    expect(src).toMatch(/const\s+saveBranchMutation\s*=\s*useMutation/);
    expect(src).toMatch(/const\s+deleteBranchMutation\s*=\s*useMutation/);
    expect(src).toMatch(/const\s+toggleBranchMutation\s*=\s*useMutation/);
  });

  it('branch components do not import the Supabase client', () => {
    for (const file of REQUIRED) {
      const src = readBranch(file);
      expect(src).not.toMatch(/@\/integrations\/supabase\/client/);
    }
  });

  it('branch components do not select * or read sensitive business columns', () => {
    for (const file of REQUIRED) {
      const src = readBranch(file);
      expect(src).not.toMatch(/select\(['"`]\*['"`]\)/i);
      // Branch-level address national_id is allowed; business-level sensitive
      // CR/tax document fields are not.
      expect(src).not.toMatch(/cr_scan_raw|cr_document_url|tax_certificate_url/);
      expect(src).not.toMatch(/BUSINESS_SAFE_COLUMNS_SELECT|businesses_public/);
    }
  });

  it('branch components do not touch publish / approval / verification logic', () => {
    for (const file of REQUIRED) {
      const src = readBranch(file);
      expect(src).not.toMatch(/approval_status|is_verified|publish_business|BusinessPublishAction|BusinessSensitiveFieldsPanel/);
    }
  });

  it('branch components avoid hex colors and TS/ESLint escape hatches', () => {
    for (const file of REQUIRED) {
      const src = readBranch(file);
      expect(src).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
      expect(src).not.toMatch(/\bas any\b/);
      expect(src).not.toMatch(/:\s*any\b/);
      expect(src).not.toMatch(/@ts-ignore|@ts-expect-error|eslint-disable/);
    }
  });

  it('AdminBusinesses.tsx stays under the Phase 5D size ceiling (≤ 1750 lines)', () => {
    const src = readFileSync(adminBusinessesPath, 'utf8');
    const lines = src.split('\n').length;
    expect(lines).toBeLessThanOrEqual(1750);
  });
});