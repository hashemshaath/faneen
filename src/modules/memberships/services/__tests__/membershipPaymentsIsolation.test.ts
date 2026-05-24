import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { resolve, join } from 'node:path';

const ROOT = resolve('.');
const AUDIT = readFileSync(resolve(ROOT, 'scripts/memberships-isolation-audit.mjs'), 'utf8');

const GUARDED = ['membership_payment_intents', 'membership_payment_webhook_events'];

describe('R4F-8C memberships isolation audit guards payment tables', () => {
  for (const t of GUARDED) {
    it(`audit script lists ${t} as guarded`, () => {
      expect(AUDIT).toContain(`"${t}"`);
    });
  }
});

function* walk(dir: string): Generator<string> {
  for (const name of readdirSync(dir)) {
    if (['node_modules', 'dist', 'build', 'coverage', '.git'].includes(name)) continue;
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) yield* walk(full);
    else yield full;
  }
}

describe('R4F-8C no UI/page/component references payment tables', () => {
  const SRC = resolve(ROOT, 'src');
  const ALLOWED_DIR = resolve(ROOT, 'src/modules/memberships/services') + '/';
  const offenders: string[] = [];

  for (const file of walk(SRC)) {
    if (file.startsWith(ALLOWED_DIR)) continue;
    if (file.endsWith('.test.ts') || file.endsWith('.test.tsx')) continue;
    if (!/\.(ts|tsx)$/.test(file)) continue;
    const src = readFileSync(file, 'utf8');
    for (const t of GUARDED) {
      if (new RegExp(`\\.from\\(\\s*['"]${t}['"]\\s*\\)`).test(src)) {
        offenders.push(`${file} -> ${t}`);
      }
    }
  }

  it('no offenders found', () => {
    expect(offenders).toEqual([]);
  });
});

describe('R4F-8C payments services are exported from @/modules/memberships', () => {
  const barrel = readFileSync(resolve(ROOT, 'src/modules/memberships/index.ts'), 'utf8');
  it('barrel re-exports payments scaffold', () => {
    expect(barrel).toMatch(/from '\.\/services\/payments'/);
  });
});