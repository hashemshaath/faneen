import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { ADMIN_NAV_ITEMS } from '@/modules/admin-shell';

/**
 * ADMIN ROUTE LINK INTEGRITY AUDIT — static guard.
 *
 * Enforces that:
 *  1. Every route in the admin navigation registry resolves to a <Route>
 *     declared in `src/App.tsx` (static or dynamic pattern).
 *  2. No admin/dashboard surface uses placeholder links (`#`, `javascript:`,
 *     or URLs containing literal `/undefined` or `/null` segments).
 *  3. No <Link to=...>, navigate(...), or <Navigate to=...> inside the
 *     admin pages, admin components, admin-shell module, or the dashboard
 *     sidebar points to a non-existent `/admin/*` or `/dashboard/*` route.
 */

const root = resolve(__dirname, '..', '..');
const APP = readFileSync(resolve(root, 'src/App.tsx'), 'utf8');

const APP_ROUTES = [...APP.matchAll(/path="([^"]+)"/g)].map((m) => m[1]);

function routeMatches(link: string): boolean {
  const clean = link.split('?')[0].split('#')[0];
  if (!clean.startsWith('/')) return true;
  if (APP_ROUTES.includes(clean)) return true;
  return APP_ROUTES.some((r) => {
    if (!r.includes(':')) return false;
    const re = new RegExp('^' + r.replace(/:[^/]+/g, '[^/]+') + '$');
    return re.test(clean);
  });
}

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) {
      if (['node_modules', '__tests__', 'tests', 'test'].includes(name)) continue;
      walk(full, out);
    } else if (/\.tsx?$/.test(name)) {
      out.push(full);
    }
  }
  return out;
}

const ADMIN_FILES = [
  ...walk(resolve(root, 'src/pages/admin')),
  ...walk(resolve(root, 'src/components/admin')),
  ...walk(resolve(root, 'src/modules/admin-shell')),
  resolve(root, 'src/components/dashboard/DashboardSidebar.tsx'),
];

describe('ADMIN_NAV_ITEMS → App.tsx', () => {
  it('every registered admin route resolves to a <Route> in App.tsx', () => {
    const missing = ADMIN_NAV_ITEMS
      .map((it) => it.route)
      .filter((r) => !APP.includes(`path="${r}"`));
    expect(missing, `missing routes: ${missing.join(', ')}`).toEqual([]);
  });
});

describe('admin surface — placeholder links banned', () => {
  it('no href/to of "#" or "javascript:" in admin or sidebar files', () => {
    const offenders: string[] = [];
    for (const f of ADMIN_FILES) {
      const s = readFileSync(f, 'utf8');
      for (const m of s.matchAll(/(?:to|href)="(#|javascript:[^"]*)"/g)) {
        offenders.push(`${f}: ${m[1]}`);
      }
    }
    expect(offenders, offenders.join('\n')).toEqual([]);
  });

  it('no /undefined or /null segments inside internal URLs', () => {
    const offenders: string[] = [];
    for (const f of ADMIN_FILES) {
      const s = readFileSync(f, 'utf8');
      for (const m of s.matchAll(/(?:to|href)="(\/[^"]*\/(?:undefined|null)(?:[/?#"][^"]*)?)"/g)) {
        offenders.push(`${f}: ${m[1]}`);
      }
    }
    expect(offenders, offenders.join('\n')).toEqual([]);
  });
});

describe('admin surface — internal links resolve', () => {
  it('every /admin/* or /dashboard/* link resolves to a registered route', () => {
    const broken: string[] = [];
    const patterns: RegExp[] = [
      /(?:to|href)="(\/[^"]+)"/g,
      /<Navigate\s+to="(\/[^"]+)"/g,
      /navigate\(\s*["'`](\/[^"'`)]+)["'`]/g,
    ];
    for (const f of ADMIN_FILES) {
      const s = readFileSync(f, 'utf8');
      for (const p of patterns) {
        p.lastIndex = 0;
        let m: RegExpExecArray | null;
        while ((m = p.exec(s)) !== null) {
          const link = m[1];
          if (!link.startsWith('/admin') && !link.startsWith('/dashboard')) continue;
          if (!routeMatches(link)) broken.push(`${f}: ${link}`);
        }
      }
    }
    expect(broken, broken.join('\n')).toEqual([]);
  });
});