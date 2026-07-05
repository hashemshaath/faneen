import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * Static guard: every `<Navigate to="...">` target inside src/App.tsx must
 * resolve to a `<Route path="...">` declared in the same file. Prevents
 * redirect-to-dead-target regressions after Phase A hub consolidation.
 *
 * Only checks internal absolute paths (`/...`). Query strings and hashes
 * are stripped before comparison. Dynamic segments (`:param`) match the
 * same-shape route pattern.
 */
const APP = readFileSync(resolve(__dirname, '../App.tsx'), 'utf8');

const ROUTE_PATHS = [...APP.matchAll(/<Route\s+path="([^"]+)"/g)].map((m) => m[1]);

const NAVIGATE_TARGETS = [...APP.matchAll(/<Navigate\s+to=\{?["'`]([^"'`}]+)["'`]\}?/g)]
  .map((m) => m[1])
  .filter((t) => t.startsWith('/'));

function matchesRoute(link: string): boolean {
  const clean = link.split('?')[0].split('#')[0];
  if (ROUTE_PATHS.includes(clean)) return true;
  return ROUTE_PATHS.some((r) => {
    if (!r.includes(':')) return false;
    const re = new RegExp('^' + r.replace(/:[^/]+/g, '[^/]+') + '$');
    return re.test(clean);
  });
}

describe('App.tsx <Navigate> targets', () => {
  it('found at least one Navigate target (sanity)', () => {
    expect(NAVIGATE_TARGETS.length).toBeGreaterThan(0);
  });

  it('every internal Navigate target resolves to a declared <Route path>', () => {
    const broken = NAVIGATE_TARGETS.filter((t) => !matchesRoute(t));
    expect(broken, `broken Navigate targets:\n${broken.join('\n')}`).toEqual([]);
  });
});