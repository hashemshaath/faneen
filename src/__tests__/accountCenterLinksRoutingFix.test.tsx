import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

/**
 * ACCOUNT CENTER LINKS ROUTING FIX — static guard suite.
 *
 * The Account Center (/admin/identity) renders `IdentityOverviewLanding`
 * whose tiles deep-link into the same TabbedShell via `?tab=<key>` and
 * one tile that links to the legacy full dashboard. This suite asserts:
 *
 *  1. Every tile target maps to a route registered in App.tsx (either an
 *     exact path or the `/admin/identity` shell that owns the tab key).
 *  2. Tiles use react-router `<Link>` — never `<a href>` for internal nav,
 *     never `window.location`, never `window.open`, never `target="_blank"`.
 *  3. AdminUsers (embedded under the Hub) does NOT consume the shell's
 *     `?tab=` param when rendered inside `EmbeddedPageContext` — that was
 *     the root cause of the "Users tile does nothing" report.
 *  4. The Hub route stays gated behind `<ProtectedRoute requireSuperAdmin>`
 *     so regular users never see broken admin tiles.
 */

const repo = (p: string) => path.join(process.cwd(), p);
const read = (p: string) => fs.readFileSync(repo(p), 'utf8');

describe('ACCOUNT CENTER LINKS ROUTING FIX', () => {
  const landing = read('src/components/admin/centers/identity/IdentityOverviewLanding.tsx');
  const hub = read('src/pages/admin/AdminIdentityHub.tsx');
  const app = read('src/App.tsx');
  const adminUsers = read('src/pages/admin/AdminUsers.tsx');

  it('1) every tile target is reachable (registered path or hub tab key)', () => {
    const tileTargets = Array.from(landing.matchAll(/to:\s*'([^']+)'/g)).map((m) => m[1]);
    expect(tileTargets.length).toBeGreaterThanOrEqual(6);
    const hubTabKeys = Array.from(hub.matchAll(/key:\s*'([^']+)'/g)).map((m) => m[1]);
    for (const to of tileTargets) {
      if (to.startsWith('/admin/identity?tab=')) {
        const key = to.split('tab=')[1];
        expect(hubTabKeys, `tab key ${key} missing from AdminIdentityHub`).toContain(key);
      } else {
        // Must be registered as an explicit Route path in App.tsx
        const escaped = to.replace(/[/.?]/g, (c) => `\\${c}`);
        expect(new RegExp(`path="${escaped}"`).test(app), `route ${to} not registered`).toBe(true);
      }
    }
  });

  it('2) tiles use <Link> only — no window.location / window.open / target=_blank / raw <a href="/', () => {
    expect(landing).toMatch(/from 'react-router-dom'/);
    expect(landing).toMatch(/<Link\b/);
    expect(landing).not.toMatch(/window\.location/);
    expect(landing).not.toMatch(/window\.open\(/);
    expect(landing).not.toMatch(/target="_blank"/);
    expect(landing).not.toMatch(/<a\s+href="\//);
  });

  it('3) AdminUsers skips ?tab consumption when embedded (root cause fix)', () => {
    expect(adminUsers).toMatch(/useEmbeddedPage/);
    expect(adminUsers).toMatch(/isEmbedded\s*\?\s*null\s*:\s*searchParams\.get\('tab'\)/);
  });

  it('4) /admin/identity stays behind requireSuperAdmin (admin links hidden for regular users)', () => {
    expect(app).toMatch(/path="\/admin\/identity"\s+element=\{<ProtectedRoute\s+requireSuperAdmin>/);
    expect(app).toMatch(/path="\/admin\/identity\/dashboard"\s+element=\{<ProtectedRoute\s+requireSuperAdmin>/);
  });

  it('5) no DB/RLS/migrations/RPC/edge calls in the landing tile component', () => {
    expect(landing).not.toMatch(/supabase/i);
    expect(landing).not.toMatch(/\.rpc\(/);
    expect(landing).not.toMatch(/from\s+['"]@\/integrations\/supabase/);
  });

  it('6) no any / suppressions / skipped tests in changed surfaces', () => {
    for (const src of [landing, hub]) {
      expect(src).not.toMatch(/:\s*any\b/);
      expect(src).not.toMatch(/as\s+any\b/);
      expect(src).not.toMatch(/@ts-(ignore|expect-error)/);
      expect(src).not.toMatch(/eslint-disable(?!\s+next-line\s+react-hooks\/rules-of-hooks)/);
    }
    expect(landing + hub).not.toMatch(/\b(it|describe|test)\.skip\b/);
  });
});