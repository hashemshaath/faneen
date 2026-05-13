import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * Static guard: ensure /dashboard/private-sectors (and other protected
 * dashboard routes) are registered in App.tsx, and that the catch-all
 * `path="*"` is the LAST route — otherwise React Router would short-circuit
 * to NotFound (404) before the real route can match.
 *
 * Pure source scan; no rendering — fast and deterministic.
 */
const APP = readFileSync(resolve(__dirname, '../App.tsx'), 'utf8');

const indexOfRoute = (path: string): number => {
  // matches: <Route path="<path>" ...
  const re = new RegExp(`<Route\\s+path="${path.replace(/[/\-^$.*+?()[\]{}|\\]/g, '\\$&')}"`);
  const m = re.exec(APP);
  return m ? m.index : -1;
};

const PROTECTED_DASHBOARD_ROUTES = [
  '/dashboard',
  '/dashboard/private-sectors',
  '/dashboard/services',
  '/dashboard/portfolio',
  '/dashboard/diagnostics',
];

describe('App route ordering', () => {
  it('declares the catch-all "*" route exactly once', () => {
    const matches = APP.match(/<Route\s+path="\*"/g) ?? [];
    expect(matches.length).toBe(1);
  });

  it('places the catch-all "*" route last among <Route> declarations', () => {
    const lastRoute = APP.lastIndexOf('<Route');
    const catchAll = APP.indexOf('<Route path="*"');
    expect(catchAll).toBeGreaterThan(0);
    expect(catchAll).toBe(lastRoute);
  });

  it('places the username dynamic route "/:username" before the catch-all', () => {
    const username = indexOfRoute('/:username');
    const catchAll = APP.indexOf('<Route path="*"');
    expect(username).toBeGreaterThan(0);
    expect(username).toBeLessThan(catchAll);
  });

  it.each(PROTECTED_DASHBOARD_ROUTES)('registers %s before the catch-all', (path) => {
    const i = indexOfRoute(path);
    const catchAll = APP.indexOf('<Route path="*"');
    expect(i, `route ${path} not found in App.tsx`).toBeGreaterThan(0);
    expect(i).toBeLessThan(catchAll);
  });

  it('guards /dashboard/private-sectors with requireProvider', () => {
    const re = /<Route\s+path="\/dashboard\/private-sectors"\s+element=\{<ProtectedRoute\s+requireProvider>/;
    expect(re.test(APP)).toBe(true);
  });
});