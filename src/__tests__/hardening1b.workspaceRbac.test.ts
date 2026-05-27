/**
 * HARDENING-1B — Workspace/RBAC + post-security-fix drift regression.
 *
 * Source-level invariants that lock in the WORKSPACE-RBAC-6A..6F design
 * and the security fixes from HARDENING-1A:
 *   - useCan stays a UI-only hint, not used by admin or critical flows.
 *   - usePermissionParity stays observability-only (non-production warn).
 *   - useHasPermission stays read-only (no enforcement, no RLS yet).
 *   - ActiveLocationSwitcher / ActiveBusinessSwitcher avoid direct
 *     `supabase.from(...)` access in the RBAC UI layer.
 *   - No workspace localStorage value is trusted as auth.
 *   - PII anon column revokes + realtime publication exclusions are
 *     codified in a migration file so a future schema reset replays them.
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(__dirname, '..', '..');
const read = (rel: string) => fs.readFileSync(path.resolve(ROOT, rel), 'utf8');

function listFiles(dir: string, filter: (p: string) => boolean): string[] {
  const out: string[] = [];
  const walk = (d: string) => {
    for (const ent of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, ent.name);
      if (ent.isDirectory()) walk(p);
      else if (filter(p)) out.push(p);
    }
  };
  walk(dir);
  return out;
}

describe('HARDENING-1B: RBAC hooks remain non-authoritative', () => {
  it('useCan is a pure UI hint backed by the static catalog (no supabase calls)', () => {
    const src = read('src/hooks/useCan.ts');
    expect(src).toContain('hasWorkspacePermission');
    expect(src).not.toMatch(/supabase\.(from|rpc)\(/);
    expect(src).toContain('NOT FOR AUTHORIZATION');
  });

  it('usePermissionParity warns only in non-production and never throws', () => {
    const src = read('src/hooks/usePermissionParity.ts');
    expect(src).toMatch(/isProductionEnv/);
    expect(src).toMatch(/if \(isProductionEnv\(\)\) return/);
    // returned mismatch flag is observability only — must say so.
    expect(src).toMatch(/callers must NOT branch/);
  });

  it('useHasPermission stays read-only and routes through the canonical wrapper', () => {
    const src = read('src/hooks/useHasPermission.ts');
    expect(src).toContain('hasPermissionServer');
    expect(src).not.toMatch(/supabase\.from\(/);
    // No enforcement — return type is { data: boolean | null, ... }.
    expect(src).toMatch(/data:\s*boolean \| null/);
  });
});

describe('HARDENING-1B: RBAC hook usage scope', () => {
  const dashboardPages = listFiles(path.resolve(ROOT, 'src/pages/dashboard'), (p) =>
    p.endsWith('.tsx'),
  );
  const adminPages = listFiles(path.resolve(ROOT, 'src/pages/admin'), (p) =>
    p.endsWith('.tsx'),
  );

  it('admin pages never import workspace permission hooks or PermissionGate', () => {
    const offenders: string[] = [];
    for (const f of adminPages) {
      const src = fs.readFileSync(f, 'utf8');
      if (/from ['"]@\/hooks\/(useCan|useHasPermission|usePermissionParity)['"]/.test(src)) {
        offenders.push(path.relative(ROOT, f));
      }
      if (/from ['"]@\/components\/workspace\/PermissionGate['"]/.test(src)) {
        offenders.push(path.relative(ROOT, f) + ' (PermissionGate)');
      }
    }
    expect(offenders, `admin pages must not use workspace RBAC hooks:\n${offenders.join('\n')}`)
      .toEqual([]);
  });

  it('critical flows (contracts, payments, memberships, leads notifications) are not gated by useCan / PermissionGate', () => {
    const critical = dashboardPages.filter((p) =>
      /(Contract|Payment|Membership|Lead).*\.tsx$/i.test(path.basename(p)),
    );
    const offenders: string[] = [];
    for (const f of critical) {
      const src = fs.readFileSync(f, 'utf8');
      if (/\buseCan\s*\(/.test(src) || /<PermissionGate\b/.test(src)) {
        offenders.push(path.relative(ROOT, f));
      }
    }
    expect(offenders, `critical flow gated by RBAC hint:\n${offenders.join('\n')}`).toEqual([]);
  });

  it('usePermissionParity is wired only in low-risk dashboard pages', () => {
    const offenders: string[] = [];
    const allowed = new Set([
      'src/pages/dashboard/DashboardServices.tsx',
      'src/pages/dashboard/DashboardBusinessEdit.tsx',
    ]);
    const allFiles = [
      ...listFiles(path.resolve(ROOT, 'src/pages'), (p) => p.endsWith('.tsx')),
      ...listFiles(path.resolve(ROOT, 'src/components'), (p) => p.endsWith('.tsx')),
    ];
    for (const f of allFiles) {
      const src = fs.readFileSync(f, 'utf8');
      if (/\busePermissionParity\s*\(/.test(src)) {
        const rel = path.relative(ROOT, f).replace(/\\/g, '/');
        if (!allowed.has(rel)) offenders.push(rel);
      }
    }
    expect(offenders, `parity wired outside allow-list:\n${offenders.join('\n')}`).toEqual([]);
  });
});

describe('HARDENING-1B: workspace switcher hygiene', () => {
  it('ActiveLocationSwitcher has no direct supabase.from / supabase.rpc calls', () => {
    const src = read('src/components/dashboard/ActiveLocationSwitcher.tsx');
    expect(src).not.toMatch(/supabase\.(from|rpc)\(/);
  });

  it('ActiveBusinessSwitcher has no direct supabase.from / supabase.rpc calls', () => {
    const src = read('src/components/dashboard/ActiveBusinessSwitcher.tsx');
    expect(src).not.toMatch(/supabase\.(from|rpc)\(/);
    // and no dead supabase client import either
    expect(src).not.toMatch(/from '@\/integrations\/supabase\/client'/);
  });

  it('useActiveWorkspace never trusts a raw localStorage value as the active entity', () => {
    const src = read('src/hooks/useActiveWorkspace.ts');
    // Either the file already filters against accessible entities, or it
    // delegates that filtering to useActiveBusiness — both are acceptable.
    expect(src).toMatch(/useActiveBusiness|accessible|memberships|allowed/i);
  });
});

describe('HARDENING-1B: security drift codified in migrations', () => {
  const migrations = listFiles(path.resolve(ROOT, 'supabase/migrations'), (p) =>
    p.endsWith('.sql'),
  ).map((p) => fs.readFileSync(p, 'utf8')).join('\n');

  it('businesses sensitive columns are REVOKEd from anon in a migration', () => {
    expect(migrations).toMatch(/REVOKE SELECT[\s\S]{0,400}national_id[\s\S]{0,400}ON public\.businesses FROM anon/i);
    expect(migrations).toMatch(/vat_number/);
    expect(migrations).toMatch(/account_manager_email/);
  });

  it('business_branches contact PII is REVOKEd from anon in a migration', () => {
    expect(migrations).toMatch(/REVOKE SELECT[\s\S]{0,300}(email|phone|mobile)[\s\S]{0,300}ON public\.business_branches FROM anon/i);
    expect(migrations).toMatch(/customer_service_phone/);
    expect(migrations).toMatch(/contact_person/);
  });

  it('sensitive realtime tables are dropped from supabase_realtime publication', () => {
    expect(migrations).toMatch(/ALTER PUBLICATION supabase_realtime DROP TABLE public\.contract_amendments/);
    expect(migrations).toMatch(/ALTER PUBLICATION supabase_realtime DROP TABLE public\.email_deliverability_alerts/);
  });
});
