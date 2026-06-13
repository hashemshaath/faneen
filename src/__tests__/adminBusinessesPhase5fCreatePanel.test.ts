import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';

const createDir = join(process.cwd(), 'src/components/admin/businesses/create');
const adminBusinessesPath = join(process.cwd(), 'src/pages/admin/AdminBusinesses.tsx');

const REQUIRED = [
  'BusinessCreatePanel.tsx',
  'BusinessCreateOwnerSection.tsx',
  'BusinessCreateBasicSection.tsx',
  'BusinessCreateContactSection.tsx',
  'BusinessCreateRegistrySection.tsx',
  'BusinessCreateLocationNotice.tsx',
  'BusinessCreateActionsFooter.tsx',
  'createFormDefaults.ts',
  'types.ts',
];

function readCreate(name: string) {
  return readFileSync(join(createDir, name), 'utf8');
}

describe('Phase 5F — AdminBusinesses create form extraction', () => {
  it('extracts the required create components and factory', () => {
    const files = readdirSync(createDir);
    for (const required of REQUIRED) {
      expect(files).toContain(required);
    }
  });

  it('AdminBusinesses.tsx wires BusinessCreatePanel and the factory', () => {
    const src = readFileSync(adminBusinessesPath, 'utf8');
    expect(src).toMatch(/<BusinessCreatePanel\b/);
    expect(src).toMatch(/from '@\/components\/admin\/businesses\/create\/BusinessCreatePanel'/);
    expect(src).toMatch(/emptyCreateBusinessForm\(\)/);
    expect(src).not.toMatch(/<CreateBusinessPanel\b/);
    // Legacy inline factory must be gone.
    expect(src).not.toMatch(/const emptyCreateForm =/);
  });

  it('create components do not import Supabase client', () => {
    for (const file of REQUIRED) {
      const src = readCreate(file);
      expect(src).not.toMatch(/@\/integrations\/supabase\/client/);
    }
  });

  it('create components do not own mutations or the create-business mutation', () => {
    for (const file of REQUIRED) {
      const src = readCreate(file);
      expect(src).not.toMatch(/useMutation\b/);
      expect(src).not.toMatch(/createBizMutation/);
      expect(src).not.toMatch(/adminCreateBusinessWithOwner\b/);
    }
  });

  it('create components do not touch publish/approval/sensitive logic', () => {
    for (const file of REQUIRED) {
      const src = readCreate(file);
      expect(src).not.toMatch(/approval_status|publish_business|BusinessPublishAction|BusinessSensitiveFieldsPanel/);
      expect(src).not.toMatch(/cr_scan_raw|cr_document_url|tax_certificate_url/);
      expect(src).not.toMatch(/BUSINESS_SAFE_COLUMNS_SELECT|businesses_public/);
    }
  });

  it('create components do not select *', () => {
    for (const file of REQUIRED) {
      const src = readCreate(file);
      expect(src).not.toMatch(/select\(['"`]\*['"`]\)/i);
    }
  });

  it('create components avoid hex colors and TS/ESLint escape hatches', () => {
    for (const file of REQUIRED) {
      const src = readCreate(file);
      expect(src).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
      expect(src).not.toMatch(/\bas any\b/);
      expect(src).not.toMatch(/:\s*any\b/);
      expect(src).not.toMatch(/@ts-ignore|@ts-expect-error|eslint-disable/);
    }
  });

  it('AdminBusinesses.tsx shrinks under the Phase 5F ceiling (≤ 1690 lines)', () => {
    const src = readFileSync(adminBusinessesPath, 'utf8');
    const lines = src.split('\n').length;
    expect(lines).toBeLessThanOrEqual(1690);
  });
});