import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = join(process.cwd(), 'src');
const read = (p: string) => readFileSync(join(root, p), 'utf8');

describe('ID-3 migration guardrails', () => {
  it('userRoles shim re-exports mutations from @/modules/identity', () => {
    const shim = read('services/userRoles.ts');
    expect(shim).toMatch(/from '@\/modules\/identity'/);
    expect(shim).toMatch(/grantRole/);
    expect(shim).toMatch(/revokeRoleById/);
    expect(shim).toMatch(/revokeRoleByUserAndRole/);
    // Shim must not contain direct user_roles access anymore.
    expect(shim).not.toMatch(/from\('user_roles'\)/);
  });

  it('AdminUsers uses identity wrappers and no direct admin edge invokes', () => {
    const f = read('pages/admin/AdminUsers.tsx');
    expect(f).toMatch(/adminResetPassword/);
    expect(f).toMatch(/adminDeleteUser/);
    expect(f).not.toMatch(/functions\.invoke\(['"]admin-reset-password['"]/);
    expect(f).not.toMatch(/functions\.invoke\(['"]admin-delete-user['"]/);
  });

  it('AdminAccessManagement uses adminResetPassword wrapper', () => {
    const f = read('pages/admin/AdminAccessManagement.tsx');
    expect(f).toMatch(/adminResetPassword/);
    expect(f).not.toMatch(/functions\.invoke\(['"]admin-reset-password['"]/);
  });

  it('password_reset_log still referenced in AdminAccessManagement (via wrapper or query keys)', () => {
    // After ID-4 the direct .from('password_reset_log') call is gone, but the
    // panel still references the table by name (query keys, wrapper imports).
    const f = read('pages/admin/AdminAccessManagement.tsx');
    expect(f).toMatch(/password-reset-logs/);
  });

  it('exact admin edge payload fields preserved', () => {
    const adminUsers = read('pages/admin/AdminUsers.tsx');
    expect(adminUsers).toMatch(/action: 'change_password'/);
    expect(adminUsers).toMatch(/action: 'send_reset_link'/);
    expect(adminUsers).toMatch(/new_password: password/);
    expect(adminUsers).toMatch(/target_user_id: targetUserId/);
    const adminAccess = read('pages/admin/AdminAccessManagement.tsx');
    expect(adminAccess).toMatch(/action: 'send_reset_link'/);
    expect(adminAccess).toMatch(/target_user_id: targetUserId/);
  });
});