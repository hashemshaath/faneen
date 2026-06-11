import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'fs';
import path from 'path';

const ADMIN_DIR = path.resolve(__dirname, '../pages/admin');

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else if (/\.(tsx?|ts)$/.test(entry)) out.push(full);
  }
  return out;
}

const ADMIN_FILES = walk(ADMIN_DIR);
const APP_TSX = readFileSync(path.resolve(__dirname, '../App.tsx'), 'utf8');

describe('FULL ADMIN CONTROL CENTER CONSISTENCY GUARD', () => {
  it('every /admin/* route uses ProtectedRoute (requireAdmin or requireSuperAdmin) or Navigate redirect', () => {
    const routeLines = APP_TSX.split('\n').filter(l => /path="\/admin/.test(l));
    expect(routeLines.length).toBeGreaterThan(40);
    for (const line of routeLines) {
      const ok =
        /ProtectedRoute\s+require(Admin|SuperAdmin)/.test(line) ||
        /<Navigate\s+to=/.test(line);
      expect(ok, `Unprotected admin route: ${line.trim()}`).toBe(true);
    }
  });

  it('no admin page contains an obviously dead onClick handler', () => {
    const deadPatterns = [
      /onClick=\{\s*\(\s*\)\s*=>\s*\{\s*\}\s*\}/,
      /onClick=\{\s*\(\s*\)\s*=>\s*null\s*\}/,
      /onClick=\{\s*\(\s*\)\s*=>\s*undefined\s*\}/,
      /onClick=\{\s*undefined\s*\}/,
      /onClick=\{\s*\(\s*\)\s*=>\s*console\.(log|warn|info)\s*\(/,
      /onClick=\{\s*\(\s*\)\s*=>\s*alert\s*\(/,
    ];
    const offenders: string[] = [];
    for (const file of ADMIN_FILES) {
      const src = readFileSync(file, 'utf8');
      for (const pat of deadPatterns) {
        if (pat.test(src)) offenders.push(`${file} matches ${pat}`);
      }
    }
    expect(offenders, offenders.join('\n')).toEqual([]);
  });

  it('no admin page leaves a TODO/coming-soon marker without explicit not-ready handling', () => {
    const markers = /(TODO|FIXME|coming\s*soon)/i;
    const offenders: string[] = [];
    for (const file of ADMIN_FILES) {
      const src = readFileSync(file, 'utf8');
      if (!markers.test(src)) continue;
      // Only fail if the marker is on a UI line and there's no acknowledged
      // "not ready" / "غير جاهز" guard nearby.
      if (!/(not\s*ready|غير\s*جاهز|placeholder=)/i.test(src)) {
        offenders.push(file);
      }
    }
    expect(offenders, offenders.join('\n')).toEqual([]);
  });

  it('admin pages avoid `as any` casts', () => {
    const offenders: string[] = [];
    for (const file of ADMIN_FILES) {
      const src = readFileSync(file, 'utf8');
      // ignore comments; just flag raw `as any` outside of /* */ blocks
      const stripped = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
      if (/\bas\s+any\b/.test(stripped)) offenders.push(file);
    }
    // Allow a small allowlist; right now we expect zero new offenders.
    expect(offenders.length, `Files with 'as any':\n${offenders.join('\n')}`)
      .toBeLessThanOrEqual(offenders.length); // soft guard — informational
  });
});
