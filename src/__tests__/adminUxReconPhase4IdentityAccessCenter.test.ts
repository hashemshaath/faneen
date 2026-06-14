import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * ADMIN UX RECONSOLIDATION PHASE 4 — Identity & Access Center guards.
 *
 * Read-only structural assertions on the Identity & Access Center shell
 * and routing surface. We do NOT mount React here; the contract is
 * structural (no query/mutation leakage into the shell, legacy deep
 * links preserved, no destructive imports, no auth/permission changes).
 */

const root = resolve(__dirname, '..', '..');
const read = (p: string) => readFileSync(resolve(root, p), 'utf8');

const APP = read('src/App.tsx');
const HUB = read('src/pages/admin/AdminIdentityHub.tsx');
const OVERVIEW = read('src/components/admin/centers/identity/IdentityOverviewLanding.tsx');

const SHELL_FILES = [
  'src/pages/admin/AdminIdentityHub.tsx',
  'src/components/admin/centers/identity/IdentityOverviewLanding.tsx',
] as const;

const REQUIRED_TAB_KEYS = [
  'overview',
  'users',
  'roles',
  'invitations',
  'activity',
  'security',
] as const;

const LEGACY_ROUTES = [
  '/admin/identity',
  '/admin/users',
  '/admin/users/:id',
  '/admin/access-management',
  '/admin/entity-access-requests',
  '/admin/activity-log',
  '/admin/system-access',
  '/admin/system/identity',
] as const;

describe('PHASE 4 — Identity & Access Center shell shape', () => {
  it('/admin/identity uses the TabbedShell-based hub', () => {
    expect(APP).toMatch(/path="\/admin\/identity"[^\n]*<AdminIdentityHub\s*\/>/);
    expect(HUB).toContain('TabbedShell');
  });

  it('exposes all required canonical tabs', () => {
    for (const key of REQUIRED_TAB_KEYS) {
      expect(HUB, `missing tab key "${key}"`).toMatch(new RegExp(`key:\\s*'${key}'`));
    }
  });

  it('legacy AdminIdentity dashboard remains reachable (additive, no deletion)', () => {
    expect(APP).toMatch(/path="\/admin\/identity\/dashboard"[^\n]*<AdminIdentity\s*\/>/);
  });
});

describe('PHASE 4 — legacy routes preserved (no deletions)', () => {
  for (const route of LEGACY_ROUTES) {
    it(`route ${route} is still registered`, () => {
      expect(APP, `missing route ${route}`).toContain(`path="${route}"`);
    });
  }
});

describe('PHASE 4 — shell purity (no query/mutation/service leakage)', () => {
  const FORBIDDEN_IMPORTS = [
    '@/integrations/supabase/client',
    '@tanstack/react-query',
    '@/modules/businessService',
    '@/services/',
    '@/modules/identity/services',
    '@/modules/users/services',
  ];

  for (const file of SHELL_FILES) {
    const src = read(file);
    for (const needle of FORBIDDEN_IMPORTS) {
      it(`${file} does not import ${needle}`, () => {
        expect(src, `${file} leaks ${needle}`).not.toContain(needle);
      });
    }
  }

  it('shell files do not declare mutations or queries', () => {
    for (const file of SHELL_FILES) {
      const src = read(file);
      expect(src).not.toMatch(/useMutation\s*\(/);
      expect(src).not.toMatch(/useQuery\s*\(/);
    }
  });
});

describe('PHASE 4 — no `any` / suppressions / hex colors in shells', () => {
  const BANNED_TOKENS = [
    ': any',
    'as any',
    '@ts-ignore',
    '@ts-expect-error',
    'eslint-disable',
  ];
  for (const file of SHELL_FILES) {
    const src = read(file);
    for (const tok of BANNED_TOKENS) {
      it(`${file} does not contain "${tok}"`, () => {
        expect(src).not.toContain(tok);
      });
    }
    it(`${file} does not contain hardcoded hex colors`, () => {
      const stripped = src
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/(^|\s)\/\/.*$/gm, '$1');
      expect(stripped).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    });
  }
});

describe('PHASE 4 — permission gates preserved', () => {
  it('/admin/identity remains requireSuperAdmin', () => {
    expect(APP).toMatch(/path="\/admin\/identity"[^\n]*ProtectedRoute\s+requireSuperAdmin/);
  });
  it('/admin/identity/dashboard remains requireSuperAdmin', () => {
    expect(APP).toMatch(/path="\/admin\/identity\/dashboard"[^\n]*ProtectedRoute\s+requireSuperAdmin/);
  });
  it('/admin/users remains requireSuperAdmin', () => {
    expect(APP).toMatch(/path="\/admin\/users"[^\n]*ProtectedRoute\s+requireSuperAdmin/);
  });
});

describe('PHASE 4 — overview landing is link-only', () => {
  it('overview landing only routes via <Link>', () => {
    expect(OVERVIEW).toContain("from 'react-router-dom'");
    expect(OVERVIEW).not.toMatch(/onClick\s*=\s*\{[^}]*mutate/);
  });
  it('overview links to each tab and to the legacy dashboard', () => {
    expect(OVERVIEW).toMatch(/\/admin\/identity\?tab=users/);
    expect(OVERVIEW).toMatch(/\/admin\/identity\?tab=roles/);
    expect(OVERVIEW).toMatch(/\/admin\/identity\?tab=invitations/);
    expect(OVERVIEW).toMatch(/\/admin\/identity\?tab=activity/);
    expect(OVERVIEW).toMatch(/\/admin\/identity\?tab=security/);
    expect(OVERVIEW).toMatch(/\/admin\/identity\/dashboard/);
  });
});