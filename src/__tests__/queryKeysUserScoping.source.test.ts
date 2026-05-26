import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Static guard: every personal React-Query key in the dashboard pages must
 * include the signed-in user's id (`user.id` / `user?.id` / `userId`) so the
 * cache is per-account. Combined with `AuthContext.resetForUser`, this keeps
 * cross-account data from ever being served from cache.
 *
 * A "personal" key is one whose first element starts with `my-` or is in the
 * known-personal list below — keys that fetch the current user's own rows.
 */
const ROOTS = ['src/pages/dashboard', 'src/components/dashboard', 'src/hooks'];

const PERSONAL_PREFIXES = ['my-'];
const PERSONAL_EXACT = new Set<string>([
  'profile', 'me', 'my-profile', 'active-business',
]);

function walk(dir: string, out: string[] = []): string[] {
  let entries: string[] = [];
  try { entries = readdirSync(dir); } catch { return out; }
  for (const name of entries) {
    const p = join(dir, name);
    const s = statSync(p);
    if (s.isDirectory()) walk(p, out);
    else if (/\.(t|j)sx?$/.test(name)) out.push(p);
  }
  return out;
}

function isPersonalKey(first: string): boolean {
  if (PERSONAL_EXACT.has(first)) return true;
  return PERSONAL_PREFIXES.some((p) => first.startsWith(p));
}

// Matches: queryKey: ['some-name', ...rest]   (single quotes or double or backticks)
const QUERY_KEY_RE = /queryKey:\s*\[\s*(['"`])([^'"`]+)\1([^\]]*)\]/g;

describe('personal query keys are scoped to user.id', () => {
  const files = ROOTS.flatMap((r) => walk(r));

  it('finds dashboard files to scan', () => {
    expect(files.length).toBeGreaterThan(10);
  });

  it('every personal queryKey contains user.id / user?.id / userId', () => {
    const offenders: string[] = [];
    for (const file of files) {
      const src = readFileSync(file, 'utf8');
      let m: RegExpExecArray | null;
      QUERY_KEY_RE.lastIndex = 0;
      while ((m = QUERY_KEY_RE.exec(src))) {
        const first = m[2];
        if (!isPersonalKey(first)) continue;
        const rest = m[3];
        const scoped =
          /\buser\??\.id\b/.test(rest) ||
          /\bcurrentUser\??\.id\b/.test(rest) ||
          /\buserId\b/.test(rest) ||
          /\bauthUserId\b/.test(rest);
        if (!scoped) {
          offenders.push(`${file}  →  queryKey: ['${first}'${rest}]`);
        }
      }
    }
    if (offenders.length) {
      throw new Error(
        'Personal query keys missing user.id scoping (cross-account cache leak risk):\n  - ' +
          offenders.join('\n  - '),
      );
    }
    expect(offenders).toEqual([]);
  });
});