import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const ROOT = resolve(__dirname, '..', '..');
const SCRIPT = resolve(ROOT, 'scripts/edge-functions-isolation-audit.mjs');

function read(p: string): string {
  return readFileSync(resolve(ROOT, p), 'utf8');
}

describe('EF-6 Edge Functions Isolation Audit', () => {
  it('audit script exists and is executable as a module', () => {
    expect(existsSync(SCRIPT)).toBe(true);
    const src = readFileSync(SCRIPT, 'utf8');
    expect(src).toContain('Edge Functions Isolation Audit');
    expect(src).toContain('functions.invoke');
  });

  it('allowed paths cover modules services and authService', () => {
    const src = readFileSync(SCRIPT, 'utf8');
    expect(src).toContain('src\\/modules\\/[^/]+\\/services\\/');
    expect(src).toContain('src/services/auth/authService.ts');
    expect(src).toContain('src/integrations/supabase/');
  });

  it('representative migrated files no longer directly invoke edge functions', () => {
    const files = [
      'src/pages/dashboard/DashboardContracts.tsx',
      'src/pages/ContractDetail.tsx',
      'src/pages/dashboard/ProviderLeadDetails.tsx',
      'src/pages/dashboard/DashboardAiCenter.tsx',
      'src/pages/admin/AdminContactMessages.tsx',
      'src/pages/admin/AdminContactInboxSettings.tsx',
      'src/pages/Unsubscribe.tsx',
      'src/pages/admin/AdminSitemapStatus.tsx',
      'src/pages/admin/AdminSiteAudit.tsx',
      'src/pages/admin/AdminAbExperiments.tsx',
    ];
    for (const f of files) {
      const src = read(f);
      expect(src, `${f} still calls functions.invoke directly`).not.toMatch(
        /\bfunctions\.invoke\s*\(/,
      );
    }
  });

  it('script exits 0 (no unauthorized direct edge function invocations)', () => {
    const res = spawnSync('node', [SCRIPT], {
      cwd: ROOT,
      encoding: 'utf8',
      env: { ...process.env, GITHUB_STEP_SUMMARY: '' },
    });
    if (res.status !== 0) {
      // surface output on failure to make CI debugging easy
      console.error(res.stdout);
      console.error(res.stderr);
    }
    expect(res.status).toBe(0);
    expect(res.stdout).toContain('No unauthorized direct edge function invocations');
  });

  it('package.json exposes the audit script and CI runs it', () => {
    const pkg = JSON.parse(read('package.json')) as { scripts: Record<string, string> };
    expect(pkg.scripts['edge-functions-isolation-audit']).toBe(
      'node scripts/edge-functions-isolation-audit.mjs',
    );
    const wf = read('.github/workflows/code-audit.yml');
    expect(wf).toContain('Edge Functions Isolation Audit');
    expect(wf).toContain('node scripts/edge-functions-isolation-audit.mjs');
  });
});