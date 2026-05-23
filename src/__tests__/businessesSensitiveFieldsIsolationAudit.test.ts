import { describe, it, expect } from 'vitest';
import { execSync } from 'node:child_process';
import { resolve } from 'node:path';
import { readFileSync } from 'node:fs';

const ROOT = resolve(__dirname, '../..');

describe('R4E-3: businesses sensitive fields isolation audit', () => {
  it('audit script lists the canonical guarded wrapper as the only non-test allowlisted file', () => {
    const src = readFileSync(resolve(ROOT, 'scripts/businesses-sensitive-fields-isolation-audit.mjs'), 'utf-8');
    expect(src).toContain('src/modules/businesses/services/guardedMutations.ts');
    expect(src).toContain('is_active');
    expect(src).toContain('is_verified');
    expect(src).toContain('is_demo');
    expect(src).toContain('approval_status');
    expect(src).toContain('user_id');
  });

  it('audit passes on current codebase', () => {
    const out = execSync('node scripts/businesses-sensitive-fields-isolation-audit.mjs', {
      encoding: 'utf-8', cwd: ROOT,
    });
    expect(out).toContain('Violations found | 0');
    expect(out).toContain('No sensitive-field leaks');
  });

  it('AdminBusinesses imports the guarded wrappers', () => {
    const src = readFileSync(resolve(ROOT, 'src/pages/admin/AdminBusinesses.tsx'), 'utf-8');
    expect(src).toContain('setBusinessActive');
    expect(src).toContain('setBusinessVerified');
    expect(src).toContain('bulkSetBusinessesActive');
    expect(src).toContain('bulkSetBusinessesVerified');
    // membership_tier path remains the RPC wrapper.
    expect(src).toContain('setBusinessMembershipTier');
  });
});