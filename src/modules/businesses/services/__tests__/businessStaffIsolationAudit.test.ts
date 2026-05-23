import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { execSync } from 'node:child_process';

const read = (rel: string) =>
  readFileSync(resolve(__dirname, '../../../../..', rel), 'utf-8');

describe('BS-4: business_staff isolation audit guardrail', () => {
  it('audit script allowlist is services-only', () => {
    const src = read('scripts/business-staff-isolation-audit.mjs');
    expect(src).toContain("ALLOWED_DIRS = [\"src/modules/businesses/services/\"]");
    expect(src).toContain("src/modules/businesses/services/");
    // Should not contain any other allowlist directories.
    expect(src).not.toContain("src/pages/");
    expect(src).not.toContain("src/components/");
    expect(src).not.toContain("src/contexts/");
    expect(src).not.toContain("src/hooks/");
  });

  it('audit script detects select, insert, update, delete, upsert on business_staff', () => {
    const src = read('scripts/business-staff-isolation-audit.mjs');
    expect(src).toContain('select');
    expect(src).toContain('insert');
    expect(src).toContain('update');
    expect(src).toContain('delete');
    expect(src).toContain('upsert');
    // The combined pattern should target direct table access.
    expect(src).toMatch(/\.from\(\s*\['"]business_staff['"]\s*\)/);
  });

  it('RepresentativesSection uses RPC (not direct table access) and is out of scope', () => {
    const src = read('src/components/dashboard/business-edit/RepresentativesSection.tsx');
    // RPC usage remains.
    expect(src).toContain(".rpc('get_business_staff_with_profiles'");
    // No direct .from('business_staff') table access remains.
    expect(src).not.toMatch(/\.from\(['"]business_staff['"]\)/);
  });

  it('no direct business_staff table access exists in app files outside services/', () => {
    // Run a direct grep to confirm zero app-level violations.
    const out = execSync(
      "rg \"\\.from\\(['\"]business_staff['\"]\\\" src/ -g '*.ts' -g '*.tsx' -n || true",
      { encoding: 'utf-8', cwd: resolve(__dirname, '../../../../..') },
    );
    const lines = out.split('\n').filter(Boolean);
    // Exclude service-layer and test files from the grep output.
    const violations = lines.filter((line) => {
      // Skip empty lines.
      if (!line.trim()) return false;
      // Skip test files.
      if (line.includes('.test.ts')) return false;
      if (line.includes('.test.tsx')) return false;
      // Skip __tests__ directories.
      if (line.includes('__tests__')) return false;
      // Skip service-layer files (canonical wrappers).
      if (line.includes('src/modules/businesses/services/')) return false;
      // The grep itself and other non-match lines.
      if (!line.includes('.from(')) return false;
      return true;
    });
    expect(violations).toEqual([]);
  });

  it('audit script passes when run standalone', () => {
    const out = execSync(
      'node scripts/business-staff-isolation-audit.mjs',
      { encoding: 'utf-8', cwd: resolve(__dirname, '../../../../..') },
    );
    expect(out).toContain('No unauthorized direct business_staff access found');
    expect(out).toContain('Allowed paths');
  });
});
