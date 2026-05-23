import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { execSync } from 'node:child_process';

const read = (rel: string) =>
  readFileSync(resolve(__dirname, '../../../../..', rel), 'utf-8');

describe('BS-4: business_staff isolation audit guardrail', () => {
  it('audit script allowlist is services-only', () => {
    const src = read('scripts/business-staff-isolation-audit.mjs');
    expect(src).toContain('ALLOWED_DIRS = ["src/modules/businesses/services/"]');
    expect(src).toContain('src/modules/businesses/services/');
    // Should not contain any other allowlist directories.
    expect(src).not.toContain('src/pages/');
    expect(src).not.toContain('src/components/');
    expect(src).not.toContain('src/contexts/');
    expect(src).not.toContain('src/hooks/');
  });

  it('audit script detects select, insert, update, delete, upsert on business_staff', () => {
    const src = read('scripts/business-staff-isolation-audit.mjs');
    // Verify the combined pattern covers all operations.
    expect(src).toContain('select');
    expect(src).toContain('insert');
    expect(src).toContain('update');
    expect(src).toContain('delete');
    expect(src).toContain('upsert');
    // The pattern should target direct table access.
    expect(src).toContain(".from('business_staff')");
  });

  it('RepresentativesSection uses RPC (not direct table access) and is out of scope', () => {
    const src = read('src/components/dashboard/business-edit/RepresentativesSection.tsx');
    // RPC usage remains.
    expect(src).toContain(".rpc('get_business_staff_with_profiles'");
    // No direct .from('business_staff') table access remains.
    expect(src).not.toMatch(/\.from\(['"]business_staff['"]\)/);
  });

  it('no direct business_staff table access exists in app files outside services/', () => {
    // Use the audit script itself as the authoritative scan.
    const out = execSync(
      'node scripts/business-staff-isolation-audit.mjs',
      { encoding: 'utf-8', cwd: resolve(__dirname, '../../../../..') },
    );
    expect(out).toContain('Violations found | 0');
    expect(out).toContain('No unauthorized direct business_staff access found');
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
