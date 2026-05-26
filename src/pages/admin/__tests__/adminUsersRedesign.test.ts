import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * ADMIN-USERS-REDESIGN-1 guards.
 *
 * Source-level safety + UX checks for /admin/users and /admin/users/:id:
 *  - super-admin route protection
 *  - synthetic phone-login emails are scrubbed before display / export
 *  - the bilingual search placeholder mentions USR and ENT
 *  - the linked-entities label is bilingual
 *  - listUserEntityLinks service wrapper exists and is used (no raw
 *    business_staff or businesses .from() reads in AdminUserDetail)
 *  - no @phone.qitaat.local copy is rendered as official email
 *  - admin-create-user goes through the adminCreateUser wrapper
 *  - useNoIndex is applied on both routes
 */

const root = resolve(__dirname, '..', '..', '..', '..');

const APP        = readFileSync(resolve(root, 'src/App.tsx'), 'utf8');
const USERS      = readFileSync(resolve(root, 'src/pages/admin/AdminUsers.tsx'), 'utf8');
const DETAIL     = readFileSync(resolve(root, 'src/pages/admin/AdminUserDetail.tsx'), 'utf8');
const SVC_PATH   = resolve(root, 'src/modules/admin/services/users/listUserEntityLinks.ts');
const SVC        = existsSync(SVC_PATH) ? readFileSync(SVC_PATH, 'utf8') : '';
const ADMIN_IDX  = readFileSync(resolve(root, 'src/modules/admin/index.ts'), 'utf8');

describe('ADMIN-USERS-REDESIGN-1: routes & protection', () => {
  it('registers /admin/users behind requireSuperAdmin', () => {
    expect(APP).toMatch(/path="\/admin\/users"[^>]*requireSuperAdmin/);
  });
  it('registers /admin/users/:id behind requireSuperAdmin', () => {
    expect(APP).toMatch(/path="\/admin\/users\/:id"[^>]*requireSuperAdmin/);
  });
  it('applies useNoIndex to both admin user pages', () => {
    expect(USERS).toContain('useNoIndex');
    expect(DETAIL).toContain('useNoIndex');
  });
});

describe('ADMIN-USERS-REDESIGN-1: synthetic email safety', () => {
  it('AdminUsers imports isSyntheticPhoneEmail', () => {
    expect(USERS).toMatch(/isSyntheticPhoneEmail/);
  });
  it('AdminUserDetail imports isSyntheticPhoneEmail', () => {
    expect(DETAIL).toMatch(/isSyntheticPhoneEmail/);
  });
  it('AdminUsers never renders profile.email without filtering synthetic', () => {
    // The display path now resolves through `officialEmail`; the raw
    // displayedEmail expression must guard against synthetic identifiers.
    expect(USERS).toMatch(/officialEmail/);
    expect(USERS).not.toContain('@phone.qitaat.local');
  });
  it('Edit form rejects @phone.qitaat.local on save', () => {
    expect(USERS).toMatch(/isSyntheticPhoneEmail\(nextEmail\)/);
  });
  it('Detail page does not display synthetic email as official', () => {
    expect(DETAIL).toMatch(/officialEmail/);
    expect(DETAIL).not.toContain('@phone.qitaat.local');
  });
});

describe('ADMIN-USERS-REDESIGN-1: bilingual copy', () => {
  it('search placeholder mentions USR and ENT in both languages', () => {
    expect(USERS).toContain('USR/ENT');
    expect(USERS).toMatch(/بحث بالاسم،\s*البريد،\s*الجوال،\s*أو\s*رقم\s*USR\/ENT/);
  });
  it('linked-entities label is bilingual on the detail page', () => {
    expect(DETAIL).toMatch(/المنشآت المرتبطة/);
    expect(DETAIL).toMatch(/Linked entities/);
  });
  it('empty linked-entities state is bilingual', () => {
    expect(DETAIL).toMatch(/لا توجد منشآت مرتبطة/);
    expect(DETAIL).toMatch(/not linked to any entity/);
  });
  it('advanced permissions notice is present in both languages', () => {
    expect(DETAIL).toMatch(/نظام الصلاحيات المتقدم/);
    expect(DETAIL).toMatch(/advanced permissions system/);
  });
});

describe('ADMIN-USERS-REDESIGN-1: entity linkage service', () => {
  it('listUserEntityLinks service file exists', () => {
    expect(existsSync(SVC_PATH)).toBe(true);
  });
  it('listUserEntityLinks composes the canonical wrappers (no raw supabase.from)', () => {
    expect(SVC).toContain('listAdminBusinesses');
    expect(SVC).toContain('listAllBusinessStaffForAdmin');
    expect(SVC).not.toMatch(/supabase\.from\(/);
  });
  it('listUserEntityLinks returns STF and ENT projections', () => {
    expect(SVC).toMatch(/staff_ref_id/);
    expect(SVC).toMatch(/business_ref_id/);
    expect(SVC).toMatch(/business_legacy_ref_id/);
    expect(SVC).toMatch(/is_primary_manager/);
  });
  it('module barrel re-exports listUserEntityLinks', () => {
    expect(ADMIN_IDX).toMatch(/listUserEntityLinks/);
    expect(ADMIN_IDX).toMatch(/UserEntityLink/);
  });
  it('AdminUserDetail uses the wrapper, not raw business_staff/businesses reads', () => {
    expect(DETAIL).toMatch(/listUserEntityLinks/);
    expect(DETAIL).not.toMatch(/from\(['"]business_staff['"]\)/);
    expect(DETAIL).not.toMatch(/listAdminBusinesses/);
  });
});

describe('ADMIN-USERS-REDESIGN-1: admin create flow', () => {
  it('AdminUsers uses adminCreateUser wrapper, not direct functions.invoke', () => {
    expect(USERS).toMatch(/adminCreateUser/);
    expect(USERS).not.toMatch(/functions\.invoke\(\s*['"]admin-create-user['"]/);
  });
});