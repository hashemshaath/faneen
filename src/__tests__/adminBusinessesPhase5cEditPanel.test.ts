import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';

const editDir = join(process.cwd(), 'src/components/admin/businesses/edit');
const adminBusinessesPath = join(process.cwd(), 'src/pages/admin/AdminBusinesses.tsx');

function readEdit(name: string) {
  return readFileSync(join(editDir, name), 'utf8');
}

describe('Phase 5C — AdminBusinesses edit panel extraction', () => {
  it('extracts the required edit section components', () => {
    const files = readdirSync(editDir);
    for (const required of [
      'BusinessBasicInfoSection.tsx',
      'BusinessContentSection.tsx',
      'BusinessMediaSection.tsx',
      'BusinessSeoSection.tsx',
      'BusinessContactSection.tsx',
      'BusinessEditActionsFooter.tsx',
    ]) {
      expect(files).toContain(required);
    }
  });

  it('AdminBusinesses.tsx wires the extracted sections', () => {
    const src = readFileSync(adminBusinessesPath, 'utf8');
    expect(src).toMatch(/<BusinessBasicInfoSection\b/);
    expect(src).toMatch(/<BusinessContentSection\b/);
    expect(src).toMatch(/<BusinessMediaSection\b/);
    expect(src).toMatch(/<BusinessSeoSection\b/);
    expect(src).toMatch(/<BusinessContactSection\b/);
    expect(src).toMatch(/<BusinessEditActionsFooter\b/);
  });

  it('edit section components do not import Supabase clients or modules', () => {
    for (const file of [
      'BusinessBasicInfoSection.tsx',
      'BusinessContentSection.tsx',
      'BusinessMediaSection.tsx',
      'BusinessSeoSection.tsx',
      'BusinessContactSection.tsx',
      'BusinessEditActionsFooter.tsx',
    ]) {
      const src = readEdit(file);
      expect(src).not.toMatch(/@\/integrations\/supabase\/client/);
      expect(src).not.toMatch(/from '@\/modules\/businesses/);
      expect(src).not.toMatch(/updateBusinessSensitiveFields/);
      expect(src).not.toMatch(/BUSINESS_SAFE_COLUMNS_SELECT/);
    }
  });

  it('edit section components do not select * or read sensitive columns', () => {
    for (const file of [
      'BusinessBasicInfoSection.tsx',
      'BusinessContentSection.tsx',
      'BusinessMediaSection.tsx',
      'BusinessSeoSection.tsx',
      'BusinessContactSection.tsx',
      'BusinessEditActionsFooter.tsx',
    ]) {
      const src = readEdit(file);
      expect(src).not.toMatch(/select\(['"`]\*['"`]\)/i);
      expect(src).not.toMatch(/cr_scan_raw|national_id|cr_document_url|tax_certificate_url/);
    }
  });

  it('edit section components avoid hardcoded hex colors and ts/eslint escape hatches', () => {
    for (const file of [
      'BusinessBasicInfoSection.tsx',
      'BusinessContentSection.tsx',
      'BusinessMediaSection.tsx',
      'BusinessSeoSection.tsx',
      'BusinessContactSection.tsx',
      'BusinessEditActionsFooter.tsx',
    ]) {
      const src = readEdit(file);
      expect(src).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
      expect(src).not.toMatch(/\bas any\b/);
      expect(src).not.toMatch(/@ts-(ignore|expect-error)/);
      expect(src).not.toMatch(/eslint-disable/);
    }
  });

  it('save and cancel handlers still originate from AdminBusinesses.tsx', () => {
    const src = readFileSync(adminBusinessesPath, 'utf8');
    // Footer is wired via props from the page, not encapsulating a save handler.
    expect(src).toMatch(/onSave=\{\(\) => updateBizMutation\.mutate\(\)\}/);
    expect(src).toMatch(/onCancel=\{\(\) => setEditingBiz\(null\)\}/);
  });

  it('publish/approval logic was not moved into the extracted sections', () => {
    for (const file of [
      'BusinessBasicInfoSection.tsx',
      'BusinessContentSection.tsx',
      'BusinessMediaSection.tsx',
      'BusinessSeoSection.tsx',
      'BusinessContactSection.tsx',
      'BusinessEditActionsFooter.tsx',
    ]) {
      const src = readEdit(file);
      expect(src).not.toMatch(/approval_status|publishBusiness|approveBusiness|setBusinessApproval/);
    }
  });
});