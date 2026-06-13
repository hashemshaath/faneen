import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

const ROOT = process.cwd();
const adminUsersPath = join(ROOT, 'src/pages/admin/AdminUsers.tsx');
const listSectionPath = join(ROOT, 'src/pages/admin/users/UsersListSection.tsx');
const rowPath = join(ROOT, 'src/pages/admin/users/UserListRow.tsx');
const detailPath = join(ROOT, 'src/pages/admin/users/UserDetailPanel.tsx');
const configsPath = join(ROOT, 'src/pages/admin/users/userConfigs.ts');
const adapterPath = join(ROOT, 'src/components/admin/users/buildUserDetailsDrawerProps.ts');

function read(p: string) {
  return readFileSync(p, 'utf8');
}

describe('Phase 6C — AdminUsers list/section extraction', () => {
  it('ships the new presentational components and pure adapter', () => {
    for (const p of [listSectionPath, rowPath, detailPath, configsPath, adapterPath]) {
      expect(() => readFileSync(p, 'utf8')).not.toThrow();
    }
  });

  it('AdminUsers.tsx wires UsersListSection + drawer adapter', () => {
    const src = read(adminUsersPath);
    expect(src).toMatch(/<UsersListSection\b/);
    expect(src).toMatch(/buildUserDetailsDrawerProps\(/);
    // Drawer composes via spread of adapter output.
    expect(src).toMatch(/buildUserDetailsDrawerProps\({\s*profile: viewingUser/);
  });

  it('AdminUsers.tsx no longer hosts the inline UserRow / UserDetailPanel blocks', () => {
    const src = read(adminUsersPath);
    expect(src).not.toMatch(/const UserRow = React\.memo/);
    expect(src).not.toMatch(/UserRow\.displayName/);
    expect(src).not.toMatch(/const UserDetailPanel = React\.memo/);
    expect(src).not.toMatch(/UserDetailPanel\.displayName/);
  });

  it('AdminUsers.tsx is now under the Phase 6C size ceiling (< 1700 lines)', () => {
    const src = read(adminUsersPath);
    expect(src.split('\n').length).toBeLessThan(1700);
  });

  it('UsersListSection owns no mutations or queries', () => {
    const src = read(listSectionPath);
    expect(src).not.toMatch(/useMutation\b/);
    expect(src).not.toMatch(/useQuery\b/);
    expect(src).not.toMatch(/queryClient/);
  });

  it('UserListRow owns no mutations / queries / Supabase client', () => {
    const src = read(rowPath);
    expect(src).not.toMatch(/useMutation\b/);
    expect(src).not.toMatch(/useQuery\b/);
    expect(src).not.toMatch(/@\/integrations\/supabase\/client/);
  });

  it('buildUserDetailsDrawerProps is a pure adapter (no Supabase / no mutations / no React state)', () => {
    const src = read(adapterPath);
    expect(src).not.toMatch(/@\/integrations\/supabase\/client/);
    expect(src).not.toMatch(/useState\b/);
    expect(src).not.toMatch(/useEffect\b/);
    expect(src).not.toMatch(/useMutation\b/);
    expect(src).not.toMatch(/useQuery\b/);
    // Returns the canonical shape required by UserDetailsDrawer.
    expect(src).toMatch(/officialEmail/);
    expect(src).toMatch(/linkedEntities/);
  });

  it('extracted files do not change auth / role / permission behavior', () => {
    for (const p of [listSectionPath, rowPath, detailPath, adapterPath]) {
      const src = read(p);
      expect(src).not.toMatch(/grantRole\b/);
      expect(src).not.toMatch(/revokeRoleById\b/);
      expect(src).not.toMatch(/adminCreateUser\b/);
      expect(src).not.toMatch(/adminResetPassword\b/);
      expect(src).not.toMatch(/adminDeleteUser\b/);
      expect(src).not.toMatch(/useAuth\b/);
    }
  });

  it('extracted files avoid TS/ESLint escape hatches and hex colors', () => {
    for (const p of [listSectionPath, rowPath, detailPath, configsPath, adapterPath]) {
      const src = read(p);
      expect(src).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
      expect(src).not.toMatch(/\bas any\b/);
      expect(src).not.toMatch(/:\s*any\b/);
      expect(src).not.toMatch(/@ts-ignore|@ts-expect-error|eslint-disable/);
    }
  });
});