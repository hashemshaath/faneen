/**
 * ORG-RBAC-STRUCTURE-9E — Source-level audit of the Staff Center
 * primary-manager delegation UI. Validates wiring without rendering.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it, expect } from 'vitest';

const FILE = join(process.cwd(), 'src/pages/dashboard/DashboardStaffCenter.tsx');
const SRC = readFileSync(FILE, 'utf8');

describe('ORG-RBAC-STRUCTURE-9E — Staff Center primary-manager UI', () => {
  it('imports the mutation hook and message mapper', () => {
    expect(SRC).toMatch(/useTransferPrimaryManagerMutation/);
    expect(SRC).toMatch(/mapTransferPrimaryManagerCode/);
    expect(SRC).toMatch(/from '@\/hooks\/useTransferPrimaryManagerMutation'/);
    expect(SRC).toMatch(/from '@\/modules\/businesses\/services\/transferPrimaryManagerMessages'/);
  });

  it('gates the action with useCan(staff.manage)', () => {
    expect(SRC).toMatch(/useCan\(['"]staff\.manage['"]\)/);
  });

  it('does not call supabase.rpc directly for transfer_primary_manager', () => {
    expect(SRC).not.toMatch(/supabase\.rpc\(['"]transfer_primary_manager['"]/);
  });

  it('contains the documented bilingual copy', () => {
    expect(SRC).toContain('Primary manager');
    expect(SRC).toContain('المدير الأساسي');
    expect(SRC).toContain('Make primary manager');
    expect(SRC).toContain('تعيين كمدير أساسي');
    expect(SRC).toContain('This will transfer operational management for this entity.');
    expect(SRC).toContain('سيتم نقل الإدارة التشغيلية لهذا الكيان.');
  });

  it('enforces reason required (length guard)', () => {
    expect(SRC).toMatch(/reason\.trim\(\)\.length\s*<\s*4/);
    expect(SRC).toMatch(/Reason \(required\)|سبب النقل \(مطلوب\)/);
  });

  it('lists eligible roles matching the RPC allow-list', () => {
    for (const role of ['owner', 'entity_admin', 'business_manager', 'operations_manager']) {
      expect(SRC).toContain(`'${role}'`);
    }
  });

  it('does not show the action for the current primary manager', () => {
    // showAction must include !isPM.
    expect(SRC).toMatch(/showAction\s*=\s*canManage\s*&&\s*eligible\s*&&\s*!isPM/);
  });

  it('does not use a Dialog/Modal/Popover/Sheet/AlertDialog', () => {
    expect(SRC).not.toMatch(/from '@\/components\/ui\/(dialog|alert-dialog|popover|sheet|drawer)'/);
  });

  it('invalidates/reloads staff list on success via load()', () => {
    // confirmTransfer calls load() on ok branch.
    expect(SRC).toMatch(/result\.ok[\s\S]{0,200}load\(\)/);
  });

  it('routes mutation errors through mapTransferPrimaryManagerCode', () => {
    expect(SRC).toMatch(/toast\.error\(\s*mapTransferPrimaryManagerCode\(/);
    expect(SRC).toMatch(/toast\.success\(\s*mapTransferPrimaryManagerCode\(/);
  });

  it('does not render raw UUID as the primary manager label', () => {
    // Badge text uses Bi-localized strings, not row.user_id / row.id.
    expect(SRC).not.toMatch(/Badge[^>]*>\s*\{r\.(user_id|id)\}/);
  });

  it('does not touch ownership / auth.users / payments / memberships', () => {
    const code = SRC.replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/g, '');
    expect(code).not.toMatch(/auth\.users/i);
    expect(code).not.toMatch(/from\(\s*['"]businesses['"]\s*\)/);
    expect(code).not.toMatch(/from\(\s*['"](payments|memberships|user_memberships)['"]\s*\)/);
    expect(code).not.toMatch(/businesses[\s\S]{0,40}user_id\s*=/);
  });

  it('does not display emails or phones for staff rows', () => {
    // StaffRow type and JSX must not expose email/phone fields.
    expect(SRC).not.toMatch(/\br\.email\b/);
    expect(SRC).not.toMatch(/\br\.phone\b/);
  });
});
