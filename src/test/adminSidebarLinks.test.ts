import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * Integrity check: every /admin/* link surfaced by DashboardSidebar must have
 * a matching <Route path="..."> registered in App.tsx (either a real page or
 * a Navigate redirect). Guards against silent 404s when sidebar entries
 * outlive a renamed/removed route.
 *
 * We parse the two source files directly with regex — no React rendering
 * required, so the check is fast and dependency-light.
 */

const repoRoot = resolve(__dirname, '..', '..');
const sidebarSrc = readFileSync(
  resolve(repoRoot, 'src/components/dashboard/DashboardSidebar.tsx'),
  'utf8',
);
const appSrc = readFileSync(resolve(repoRoot, 'src/App.tsx'), 'utf8');

function extractSidebarAdminLinks(src: string): string[] {
  const links = new Set<string>();
  const re = /url:\s*['"`](\/admin[^'"`]*)['"`]/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(src)) !== null) {
    // Strip query strings — we only care that the base path resolves.
    const path = m[1].split('?')[0];
    links.add(path);
  }
  return [...links].sort();
}

function extractRoutePaths(src: string): string[] {
  const paths = new Set<string>();
  const re = /path=["'](\/admin[^"']*)["']/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(src)) !== null) paths.add(m[1]);
  return [...paths].sort();
}

function matchesRegisteredRoute(link: string, routes: string[]): boolean {
  if (routes.includes(link)) return true;
  // Match parametric routes like /admin/quote-requests/:id against /admin/quote-requests/<value>
  return routes.some((route) => {
    if (!route.includes(':')) return false;
    const pattern = '^' + route.replace(/:[^/]+/g, '[^/]+') + '$';
    return new RegExp(pattern).test(link);
  });
}

describe('admin sidebar link integrity', () => {
  const sidebarLinks = extractSidebarAdminLinks(sidebarSrc);
  const registeredRoutes = extractRoutePaths(appSrc);

  it('extracts a sane number of sidebar admin links', () => {
    expect(sidebarLinks.length).toBeGreaterThan(20);
  });

  it('registers at least one route per sidebar link (no silent 404s)', () => {
    const broken = sidebarLinks.filter(
      (link) => !matchesRegisteredRoute(link, registeredRoutes),
    );
    expect(broken, `Sidebar links missing a Route in App.tsx:\n${broken.join('\n')}`).toEqual([]);
  });

  it('exposes a top-level /admin landing (or redirect) so /admin never falls through to UsernameResolver', () => {
    expect(registeredRoutes).toContain('/admin');
  });
});