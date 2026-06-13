import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';

const dir = join(process.cwd(), 'src/components/admin/users');
const adminUsersPath = join(process.cwd(), 'src/pages/admin/AdminUsers.tsx');

const REQUIRED = [
  'AdminUsersStatsStrip.tsx',
  'UserStatusBadge.tsx',
  'UserRowActions.tsx',
  'UserDetailsDrawer.tsx',
  'AdminUsersPageShell.tsx',
  'types.ts',
];

function read(name: string) {
  return readFileSync(join(dir, name), 'utf8');
}

describe('Phase 6A — AdminUsers UX/structural rebuild', () => {
  it('ships the required AdminUsers presentational components', () => {
    const files = readdirSync(dir);
    for (const required of REQUIRED) {
      expect(files).toContain(required);
    }
  });

  it('AdminUsers.tsx wires the new AdminUsersStatsStrip', () => {
    const src = readFileSync(adminUsersPath, 'utf8');
    expect(src).toMatch(/<AdminUsersStatsStrip\b/);
    expect(src).toMatch(/from '@\/components\/admin\/users\/AdminUsersStatsStrip'/);
    expect(src).toMatch(/buildAdminUserStats\(/);
  });

  it('presentational components do not import the Supabase client', () => {
    for (const file of REQUIRED) {
      const src = read(file);
      expect(src).not.toMatch(/@\/integrations\/supabase\/client/);
    }
  });

  it('presentational components do not own mutations or queries', () => {
    for (const file of REQUIRED) {
      const src = read(file);
      expect(src).not.toMatch(/useMutation\b/);
      expect(src).not.toMatch(/useQuery\b/);
      expect(src).not.toMatch(/queryClient/);
    }
  });

  it('presentational components do not touch auth/roles behavior', () => {
    for (const file of REQUIRED) {
      const src = read(file);
      expect(src).not.toMatch(/grantRole\b/);
      expect(src).not.toMatch(/revokeRoleById\b/);
      expect(src).not.toMatch(/adminCreateUser\b/);
      expect(src).not.toMatch(/adminResetPassword\b/);
      expect(src).not.toMatch(/adminDeleteUser\b/);
      expect(src).not.toMatch(/useAuth\b/);
    }
  });

  it('presentational components avoid hex colors and TS/ESLint escape hatches', () => {
    for (const file of REQUIRED) {
      const src = read(file);
      expect(src).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
      expect(src).not.toMatch(/\bas any\b/);
      expect(src).not.toMatch(/:\s*any\b/);
      expect(src).not.toMatch(/@ts-ignore|@ts-expect-error|eslint-disable/);
    }
  });

  it('UserRowActions exposes a single unified dropdown (no cluttered icon row)', () => {
    const src = read('UserRowActions.tsx');
    expect(src).toMatch(/DropdownMenu\b/);
    // All canonical row actions live inside the single dropdown.
    for (const label of ['View', 'Edit', 'Activity log', 'Permissions', 'Suspend', 'Activate']) {
      expect(src).toContain(label);
    }
    // The trigger is a single icon-button (no inline icon row).
    const triggers = src.match(/<DropdownMenuTrigger\b/g) ?? [];
    expect(triggers.length).toBe(1);
  });

  it('UserStatusBadge supports the required variants', () => {
    const src = read('UserStatusBadge.tsx');
    for (const v of ['active', 'suspended', 'pending', 'admin', 'provider', 'customer']) {
      expect(src).toMatch(new RegExp(`['"]${v}['"]`));
    }
  });
});