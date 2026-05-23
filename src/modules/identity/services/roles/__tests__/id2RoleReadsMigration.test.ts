import { describe, it, expect } from 'vitest';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';

const ROOT = resolve(__dirname, '../../../../../../');

function rg(pattern: string, extra: string[] = []): string {
  try {
    return execFileSync(
      'rg',
      [
        '-n',
        pattern,
        'src/',
        '-g', '!**/__tests__/**',
        '-g', '!*.test.*',
        '-g', '!src/integrations/supabase/types.ts',
        ...extra,
      ],
      { cwd: ROOT, encoding: 'utf8' },
    );
  } catch (err) {
    // rg exits 1 when there are no matches — treat as empty
    const e = err as { status?: number; stdout?: string };
    if (e.status === 1) return '';
    throw err;
  }
}

describe('ID-2 role read migration guard', () => {
  it('no direct from("user_roles") .select outside identity service + legacy shim', () => {
    const hits = rg(
      "\\.from\\(['\"]user_roles['\"]\\)\\s*\\.\\s*select\\(",
    )
      .split('\n')
      .filter(Boolean)
      .filter(
        (line) =>
          !line.startsWith('src/modules/identity/services/roles/') &&
          !line.startsWith('src/services/userRoles.ts'),
      );
    expect(hits).toEqual([]);
  });

  it('no direct rpc("has_role") outside identity service + legacy shim', () => {
    const hits = rg(
      "\\.rpc\\(\\s*['\"]has_role['\"]",
    )
      .split('\n')
      .filter(Boolean)
      // doc-only mention in src/services/rpc.ts comment is acceptable
      .filter(
        (line) =>
          !line.startsWith('src/modules/identity/services/roles/') &&
          !line.startsWith('src/services/userRoles.ts') &&
          !line.startsWith('src/services/rpc.ts'),
      );
    expect(hits).toEqual([]);
  });

  it('migrated read callsites import from @/modules/identity', () => {
    const files = [
      'src/contexts/AuthContext.tsx',
      'src/pages/dashboard/overview/AdminDashboardView.tsx',
      'src/pages/dashboard/DashboardInstallments.tsx',
      'src/pages/dashboard/DashboardAccountDiagnostics.tsx',
      'src/pages/admin/AdminUsers.tsx',
      'src/pages/admin/AdminAccessManagement.tsx',
    ];
    const fs = require('node:fs') as typeof import('node:fs');
    for (const f of files) {
      const src = fs.readFileSync(resolve(ROOT, f), 'utf8');
      expect(src).toMatch(/from ['"]@\/modules\/identity['"]/);
    }
  });

  it('legacy shim still exports mutations (deferred to ID-3)', async () => {
    const legacy = await import('@/services/userRoles');
    expect(typeof legacy.grantRole).toBe('function');
    expect(typeof legacy.revokeRoleById).toBe('function');
    expect(typeof legacy.revokeRoleByUserAndRole).toBe('function');
  });
});