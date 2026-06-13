import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';

const sectionsDir = join(process.cwd(), 'src/components/admin/businesses/sections');
const adminBusinessesPath = join(process.cwd(), 'src/pages/admin/AdminBusinesses.tsx');

const REQUIRED = [
  'BusinessControlsSection.tsx',
  'BusinessOperationsSection.tsx',
  'BusinessOwnerSectionShell.tsx',
  'BusinessActionNotice.tsx',
  'BusinessAdminActionCard.tsx',
];

function readSection(name: string) {
  return readFileSync(join(sectionsDir, name), 'utf8');
}

describe('Phase 5E — AdminBusinesses ops/controls extraction', () => {
  it('extracts the required section components', () => {
    const files = readdirSync(sectionsDir);
    for (const required of REQUIRED) {
      expect(files).toContain(required);
    }
  });

  it('AdminBusinesses.tsx wires the new sections', () => {
    const src = readFileSync(adminBusinessesPath, 'utf8');
    expect(src).toMatch(/<BusinessControlsSection\b/);
    expect(src).toMatch(/<BusinessOperationsSection\b/);
    expect(src).toMatch(/<BusinessOwnerSectionShell\b/);
  });

  it('section components do not import Supabase client', () => {
    for (const file of REQUIRED) {
      const src = readSection(file);
      expect(src).not.toMatch(/@\/integrations\/supabase\/client/);
    }
  });

  it('section components do not contain mutations or queries', () => {
    for (const file of REQUIRED) {
      const src = readSection(file);
      expect(src).not.toMatch(/useMutation\b/);
      expect(src).not.toMatch(/useQuery\b/);
      expect(src).not.toMatch(/queryClient/);
    }
  });

  it('section components do not touch publish/approval/verification/security logic', () => {
    for (const file of REQUIRED) {
      const src = readSection(file);
      expect(src).not.toMatch(/approval_status|publish_business|BusinessPublishAction|BusinessSensitiveFieldsPanel/);
      expect(src).not.toMatch(/cr_scan_raw|cr_document_url|tax_certificate_url/);
      expect(src).not.toMatch(/BUSINESS_SAFE_COLUMNS_SELECT|businesses_public/);
    }
  });

  it('section components do not select *', () => {
    for (const file of REQUIRED) {
      const src = readSection(file);
      expect(src).not.toMatch(/select\(['"`]\*['"`]\)/i);
    }
  });

  it('section components avoid hex colors and TS/ESLint escape hatches', () => {
    for (const file of REQUIRED) {
      const src = readSection(file);
      expect(src).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
      expect(src).not.toMatch(/\bas any\b/);
      expect(src).not.toMatch(/:\s*any\b/);
      expect(src).not.toMatch(/@ts-ignore|@ts-expect-error|eslint-disable/);
    }
  });

  it('AdminBusinesses.tsx stays under the Phase 5E size ceiling (≤ 1725 lines)', () => {
    const src = readFileSync(adminBusinessesPath, 'utf8');
    const lines = src.split('\n').length;
    expect(lines).toBeLessThanOrEqual(1725);
  });
});