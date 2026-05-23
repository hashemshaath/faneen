import { describe, it, expect } from 'vitest';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(__dirname, '../../');
const SCRIPT = resolve(ROOT, 'scripts/catalog-isolation-audit.mjs');
const read = (rel: string) => readFileSync(resolve(ROOT, rel), 'utf8');

describe('CAT-6 catalog isolation audit script', () => {
  it('script exists', () => {
    expect(existsSync(SCRIPT)).toBe(true);
  });

  const SCRIPT_SRC = readFileSync(SCRIPT, 'utf8');

  it('guards every catalog table', () => {
    for (const t of [
      'business_services',
      'business_service_areas',
      'business_branches',
      'business_availability',
      'business_bnpl_providers',
      'bnpl_providers',
      'warranties',
    ]) {
      expect(SCRIPT_SRC).toContain(`"${t}"`);
    }
  });

  it('declares canonical allowed paths', () => {
    expect(SCRIPT_SRC).toContain('src/modules/catalog/services/');
    expect(SCRIPT_SRC).toContain('src/modules/contracts/services/aggregates.ts');
  });

  it('is wired into package.json', () => {
    const pkg = JSON.parse(read('package.json'));
    expect(pkg.scripts['catalog-isolation-audit']).toBe(
      'node scripts/catalog-isolation-audit.mjs',
    );
  });

  it('is wired into the CI workflow', () => {
    const yml = read('.github/workflows/code-audit.yml');
    expect(yml).toContain('Catalog Isolation Audit');
    expect(yml).toContain('node scripts/catalog-isolation-audit.mjs');
  });

  it('exits 0 against the live source tree', () => {
    const out = execFileSync('node', [SCRIPT], { cwd: ROOT, encoding: 'utf8' });
    expect(out).toMatch(/No unauthorized direct catalog access found/);
  }, 30_000);
});