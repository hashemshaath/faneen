import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Isolation guard: only the central `addresses` microservice may invoke the
 * `national-address-lookup` edge function. This keeps SPL lookups consistent
 * (single chokepoint for retries, error mapping, source tagging) and prevents
 * regression to ad-hoc copy-pasted `supabase.functions.invoke('national-…')`
 * calls scattered across the codebase.
 */
const ROOTS = ['src'];
const ALLOWED_PREFIX = 'src/modules/addresses/';

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

describe('addresses isolation — SPL chokepoint', () => {
  const files = ROOTS.flatMap((r) => walk(r));
  const offenders: string[] = [];
  for (const file of files) {
    if (file.split('\\').join('/').startsWith(ALLOWED_PREFIX)) continue;
    if (file.includes('__tests__')) continue;
    const src = readFileSync(file, 'utf8');
    if (/functions\.invoke\(\s*['"`]national-address-lookup['"`]/.test(src)) {
      offenders.push(file);
    }
  }
  it('no file outside @/modules/addresses calls national-address-lookup directly', () => {
    if (offenders.length) {
      throw new Error(
        'Direct calls to `national-address-lookup` are forbidden outside the addresses microservice.\n' +
        'Use `resolveFromSpl` from `@/modules/addresses` instead. Offenders:\n  - ' +
        offenders.join('\n  - '),
      );
    }
    expect(offenders).toEqual([]);
  });
});