import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

const adminUsersPath = join(process.cwd(), 'src/pages/admin/AdminUsers.tsx');
const presentationalDir = join(process.cwd(), 'src/components/admin/users');
const PRESENTATIONAL_FILES = [
  'AdminUsersPageShell.tsx',
  'UserRowActions.tsx',
  'UserDetailsDrawer.tsx',
  'UserStatusBadge.tsx',
  'AdminUsersStatsStrip.tsx',
  'types.ts',
];

function readAdmin(): string {
  return readFileSync(adminUsersPath, 'utf8');
}

describe('Phase 6B — AdminUsers wiring of shell / row actions / drawer', () => {
  it('AdminUsers.tsx actually renders AdminUsersPageShell', () => {
    const src = readAdmin();
    expect(src).toMatch(/<AdminUsersPageShell\b/);
    expect(src).toMatch(/from '@\/components\/admin\/users\/AdminUsersPageShell'/);
  });

  it('AdminUsers.tsx renders the unified UserRowActions inside the list row', () => {
    const src = readAdmin();
    expect(src).toMatch(/<UserRowActions\b/);
    expect(src).toMatch(/from '@\/components\/admin\/users\/UserRowActions'/);
    // The old per-icon Pencil/KeyRound/Ban/UserX buttons in the row are
    // consolidated into the dropdown — no stray inline-icon Buttons remain
    // hooked to the row-level edit / password / delete handlers.
    expect(src).not.toMatch(/onClick=\{\(\) => onEdit\(profile\)\}/);
    expect(src).not.toMatch(/onClick=\{\(\) => onPassword\(profile\)\}/);
    expect(src).not.toMatch(/onClick=\{\(\) => onDelete\(profile\)\}/);
    expect(src).not.toMatch(/onClick=\{\(\) => onToggleBan\(profile\)\}/);
  });

  it('AdminUsers.tsx wires the read-only UserDetailsDrawer with viewingUser state', () => {
    const src = readAdmin();
    expect(src).toMatch(/<UserDetailsDrawer\b/);
    expect(src).toMatch(/from '@\/components\/admin\/users\/UserDetailsDrawer'/);
    expect(src).toMatch(/setViewingUser\b/);
    expect(src).toMatch(/closeViewingUser\b/);
  });

  it('AdminUsers.tsx uses UserStatusBadge for the suspended/disabled row state', () => {
    const src = readAdmin();
    expect(src).toMatch(/<UserStatusBadge\b/);
    expect(src).toMatch(/variant="suspended"/);
  });

  it('presentational components remain free of Supabase / mutations / queries', () => {
    for (const file of PRESENTATIONAL_FILES) {
      const src = readFileSync(join(presentationalDir, file), 'utf8');
      expect(src, file).not.toMatch(/@\/integrations\/supabase\/client/);
      expect(src, file).not.toMatch(/\buseMutation\b/);
      expect(src, file).not.toMatch(/\buseQuery\b/);
      expect(src, file).not.toMatch(/queryClient/);
    }
  });

  it('UserDetailsDrawer is read-only (no mutations, no role/password/ban handlers)', () => {
    const src = readFileSync(join(presentationalDir, 'UserDetailsDrawer.tsx'), 'utf8');
    expect(src).not.toMatch(/grantRole|revokeRoleById|adminResetPassword|adminDeleteUser/);
    expect(src).not.toMatch(/onSave|onEdit|onToggleActive|onPassword|onDelete/);
    expect(src).not.toMatch(/\.update\(|\.insert\(|\.delete\(/);
  });

  it('presentational components avoid hex colors and TS/ESLint escape hatches', () => {
    for (const file of PRESENTATIONAL_FILES) {
      const src = readFileSync(join(presentationalDir, file), 'utf8');
      expect(src, file).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
      expect(src, file).not.toMatch(/\bas any\b/);
      expect(src, file).not.toMatch(/:\s*any\b/);
      expect(src, file).not.toMatch(/@ts-ignore|@ts-expect-error|eslint-disable/);
    }
  });
});