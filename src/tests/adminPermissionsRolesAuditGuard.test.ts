import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'fs';
import path from 'path';

const ADMIN_DIR = path.resolve(__dirname, '../pages/admin');
const APP_TSX = readFileSync(path.resolve(__dirname, '../App.tsx'), 'utf8');
const PROTECTED_ROUTE = readFileSync(
  path.resolve(__dirname, '../components/auth/ProtectedRoute.tsx'),
  'utf8',
);

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const e of readdirSync(dir)) {
    const full = path.join(dir, e);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else if (/\.(tsx?|ts)$/.test(e)) out.push(full);
  }
  return out;
}
const ADMIN_FILES = walk(ADMIN_DIR);

/**
 * Routes that intentionally render as plain `<Navigate to="..." replace />`
 * redirects to a `?tab=` query on a sibling admin page. These targets are
 * themselves admin-guarded, so the redirect carries the protection forward.
 */
const REDIRECT_ONLY_PATTERN = /<Navigate\s+to=/;

describe('ADMIN PERMISSIONS & ROLES AUDIT GUARD', () => {
  it('ProtectedRoute denies access when role is missing (returns Forbidden, not children)', () => {
    expect(PROTECTED_ROUTE).toMatch(/requireSuperAdmin\s*&&\s*!isSuperAdmin/);
    expect(PROTECTED_ROUTE).toMatch(/requireAdmin\s*&&\s*!isAdmin/);
    expect(PROTECTED_ROUTE).toMatch(/<Forbidden\s*\/>/);
    expect(PROTECTED_ROUTE).toMatch(/logUnauthorizedAccess/);
  });

  it('every /admin/* route enforces requireAdmin / requireSuperAdmin or is a guarded redirect', () => {
    const routeLines = APP_TSX.split('\n').filter(l => /path="\/admin/.test(l));
    expect(routeLines.length).toBeGreaterThan(50);
    const offenders: string[] = [];
    for (const line of routeLines) {
      const guarded =
        /ProtectedRoute\s+require(Admin|SuperAdmin)/.test(line) ||
        REDIRECT_ONLY_PATTERN.test(line);
      if (!guarded) offenders.push(line.trim());
    }
    expect(offenders, offenders.join('\n')).toEqual([]);
  });

  it('super-admin-only domains use requireSuperAdmin', () => {
    // Routes that manage roles / identity / users globally must be super_admin.
    const requiredSuper = [
      '/admin/users',
      '/admin/users/:id',
      '/admin/identity',
      '/admin/access-management',
    ];
    for (const p of requiredSuper) {
      const re = new RegExp(
        `path="${p.replace(/[/:]/g, ch => '\\' + ch)}"[^\\n]*ProtectedRoute\\s+requireSuperAdmin`,
      );
      expect(re.test(APP_TSX), `Missing requireSuperAdmin on ${p}`).toBe(true);
    }
  });

  it('admin pages never rely on UI hiding alone — every admin_* RPC call goes through supabase.rpc (server-enforced)', () => {
    // Sanity: any client-side admin action must invoke a real RPC.
    // We accept that the role check lives in the SECURITY DEFINER function.
    const offenders: string[] = [];
    for (const file of ADMIN_FILES) {
      const src = readFileSync(file, 'utf8');
      // Look for hand-rolled "if (isAdmin) { mutate }" without an RPC/table call.
      // We can't fully prove server enforcement statically, but we flag
      // obvious client-only role gates that never reach the network.
      const m = src.match(
        /if\s*\(\s*(isAdmin|isSuperAdmin)\s*\)\s*\{[^}]{0,200}\}\s*(?!.*supabase\.)/s,
      );
      if (m) offenders.push(`${file}: client-only role gate`);
    }
    expect(offenders, offenders.join('\n')).toEqual([]);
  });

  it('admin RPC call sites do not silently swallow permission errors', () => {
    // Spot-check: result of supabase.rpc('admin_...') must surface error,
    // not be ignored entirely. We flag obvious `.rpc('admin_...')` with no
    // `error` reference in the next 8 lines.
    const offenders: string[] = [];
    for (const file of ADMIN_FILES) {
      const src = readFileSync(file, 'utf8');
      const lines = src.split('\n');
      lines.forEach((ln, i) => {
        if (/\.rpc\(['"]admin_/.test(ln)) {
          const window_ = lines.slice(Math.max(0, i - 1), i + 8).join('\n');
          if (!/error|throw|toast|catch/i.test(window_)) {
            offenders.push(`${file}:${i + 1}`);
          }
        }
      });
    }
    expect(offenders, offenders.join('\n')).toEqual([]);
  });
});
